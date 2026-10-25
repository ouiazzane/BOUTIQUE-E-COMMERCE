import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';

import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';

const expectedCategorySlugs = ['electronique', 'mode', 'maison', 'accessoires'];
const expectedProductSkus = [
  'ELE-001', 'ELE-002', 'ELE-003', 'ELE-004', 'ELE-005', 'ELE-006',
  'MOD-001', 'MOD-002', 'MOD-003', 'MOD-004',
  'MAI-001', 'MAI-002', 'MAI-003', 'MAI-004', 'MAI-005', 'MAI-006',
  'ACC-001', 'ACC-002', 'ACC-003', 'ACC-004', 'ACC-005'
];
const targetDatabase = 'codealpha_ecommerce';

function assertAtlasTarget() {
  const uri = env.MONGODB_URI;
  const authority = uri.slice(uri.indexOf('://') + 3).split(/[/?#]/, 1)[0] ?? '';
  const hosts = authority.slice(authority.lastIndexOf('@') + 1).split(',');

  if (!uri || /<[^>]+>/.test(uri) || !/^mongodb(?:\+srv)?:\/\//i.test(uri) || hosts.some((host) => !host.split(':')[0].endsWith('.mongodb.net'))) {
    throw new Error('Configured MongoDB target is incomplete or is not Atlas.');
  }
}

async function assertSeedPersisted() {
  const categoryDocs = await Category.find({ slug: { $in: expectedCategorySlugs } }).select('name slug').lean();
  const products = await Product.find({ sku: { $in: expectedProductSkus } })
    .populate('categoryId', 'name slug')
    .select('name slug sku price categoryId')
    .lean();

  if (categoryDocs.length !== expectedCategorySlugs.length) {
    throw new Error(`Expected ${expectedCategorySlugs.length} seed categories, found ${categoryDocs.length}.`);
  }
  if (products.length !== expectedProductSkus.length) {
    throw new Error(`Expected ${expectedProductSkus.length} seed products, found ${products.length}.`);
  }

  const invalidProduct = products.find((product) =>
    !product.name || !product.slug || !product.sku || !(product.price >= 0) || !product.categoryId
  );
  if (invalidProduct) {
    throw new Error('A seed product is missing required fields or its category reference.');
  }

  return { categories: categoryDocs.length, products: products.length };
}

async function main() {
  let testCategoryId: mongoose.Types.ObjectId | undefined;
  try {
    assertAtlasTarget();
    await connectDatabase();
    if (mongoose.connection.name !== targetDatabase) {
      throw new Error('Connected database does not match the required Atlas database.');
    }
    const firstRead = await assertSeedPersisted();
    console.log(`First Atlas read: ${firstRead.categories}/${expectedCategorySlugs.length} categories and ${firstRead.products}/${expectedProductSkus.length} products found.`);

    await disconnectDatabase();
    await connectDatabase();
    if (mongoose.connection.name !== targetDatabase) {
      throw new Error('Fresh connection is not using the required Atlas database.');
    }
    await mongoose.connection.db!.admin().command({ ping: 1 });
    const freshRead = await assertSeedPersisted();
    console.log(`Fresh Atlas connection: ${freshRead.categories}/${expectedCategorySlugs.length} categories and ${freshRead.products}/${expectedProductSkus.length} products re-read successfully.`);

    const unique = randomUUID();
    const testSlug = `atlas-crud-verification-${unique}`;
    const created = await Category.create({
      name: `Atlas CRUD verification ${unique.slice(0, 8)}`,
      slug: testSlug,
      description: 'Temporary Atlas persistence verification record.',
      image: '',
      isActive: true
    });
    testCategoryId = created._id;

    const readBack = await Category.findById(testCategoryId).lean();
    if (!readBack || readBack.slug !== testSlug) throw new Error('CRUD create/read verification failed.');
    console.log('CRUD insert/read: passed.');

    await Category.updateOne({ _id: testCategoryId }, { $set: { description: 'Atlas CRUD update verified.' } });
    const updated = await Category.findById(testCategoryId).lean();
    if (updated?.description !== 'Atlas CRUD update verified.') throw new Error('CRUD update verification failed.');
    console.log('CRUD update: passed.');

    await Category.deleteOne({ _id: testCategoryId });
    const deletedCheck = await Category.exists({ _id: testCategoryId });
    if (deletedCheck) throw new Error('CRUD delete verification failed.');
    testCategoryId = undefined;
    console.log('CRUD delete of the temporary test document: passed. Seed documents were retained.');

    const database = mongoose.connection.db!;
    const collections = await database.listCollections({}, { nameOnly: true }).toArray();
    console.log(`Final Atlas collection counts in ${database.databaseName}:`);
    for (const { name } of collections) {
      console.log(`${name}: ${await database.collection(name).countDocuments({})}`);
    }

    const finalSeedCounts = await assertSeedPersisted();
    if (finalSeedCounts.categories !== expectedCategorySlugs.length || finalSeedCounts.products !== expectedProductSkus.length) {
      throw new Error('Seed records changed during the temporary CRUD test.');
    }
    console.log('Atlas persistence verification passed.');
  } catch (error) {
    const code = (error as { code?: unknown })?.code;
    console.error(`Atlas verification failed${code ? ` (code ${String(code)})` : ''}. No seed record was deleted by this verifier.`);
    process.exitCode = 1;
  } finally {
    if (testCategoryId && mongoose.connection.readyState === 1) {
      await Category.deleteOne({ _id: testCategoryId }).catch(() => undefined);
      console.error('Temporary CRUD document cleanup was attempted by its exact generated ID.');
    }
    if (mongoose.connection.readyState !== 0) {
      await disconnectDatabase();
    }
  }
}

await main();