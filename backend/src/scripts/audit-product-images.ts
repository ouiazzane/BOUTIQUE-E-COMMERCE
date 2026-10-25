import mongoose from 'mongoose';

import { connectDatabase, disconnectDatabase } from '../config/database.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import { describeMongoConnectionError } from '../utils/mongoDiagnostics.js';

async function main() {
  let connected = false;
  try {
    await connectDatabase();
    connected = true;
    if (mongoose.connection.name !== 'codealpha_ecommerce') {
      throw new Error('Connected database did not match the expected catalog database.');
    }

    const products = await Product.find({}).select('name slug sku categoryId images').lean();
    const categoryIds = [...new Set(products.map((product) => String(product.categoryId)))];
    const categories = await Category.find({ _id: { $in: categoryIds } }).select('name slug').lean();
    const categoryById = new Map(categories.map((category) => [String(category._id), category]));
    const byImage = new Map<string, string[]>();
    let missingImages = 0;
    let invalidUrls = 0;
    const seedAssetId = (url: string) => url.match(/photo-[a-zA-Z0-9-]+/)?.[0] ?? 'non-unsplash-url';

    for (const product of products) {
      const urls = (product.images ?? []).map((image) => image.url).filter((url): url is string => typeof url === 'string' && url.length > 0);
      if (urls.length === 0) missingImages += 1;
      if (urls.length !== (product.images ?? []).length) invalidUrls += 1;
      const categoryName = categoryById.get(String(product.categoryId))?.name ?? 'catégorie non résolue';
      const ids = urls.map(seedAssetId);
      console.log(`${product.sku} | ${product.name} | ${categoryName} | images=${ids.length ? ids.join(', ') : 'aucune'}`);
      for (const id of ids) {
        const items = byImage.get(id) ?? [];
        items.push(product.sku);
        byImage.set(id, items);
      }
    }

    console.log(`Database: ${mongoose.connection.name}`);
    console.log(`Products inspected: ${products.length}; no-image: ${missingImages}; invalid/empty image entries: ${invalidUrls}.`);
    console.log('Repeated asset IDs used by multiple products:');
    const repeated = [...byImage.entries()].filter(([, skus]) => skus.length > 1);
    if (repeated.length === 0) console.log('none');
    for (const [imageId, skus] of repeated) console.log(`${imageId}: ${skus.join(', ')}`);

  } catch (error) {
    const code = (error as { code?: unknown })?.code;
    const name = error instanceof Error ? error.name : 'UnknownError';
    console.error(`Product image audit failed (${name}${code ? `, code ${String(code)}` : ''}): ${describeMongoConnectionError(error)} No data was modified.`);
    process.exitCode = 1;
  } finally {
    if (connected || mongoose.connection.readyState !== 0) await disconnectDatabase();
  }
}

await main();
