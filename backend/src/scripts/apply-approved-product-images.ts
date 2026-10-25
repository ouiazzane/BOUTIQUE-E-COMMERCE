import mongoose from 'mongoose';

import { connectDatabase, disconnectDatabase } from '../config/database.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

const approvedImages = [
  { sku: 'MOD-001', category: 'mode', oldAsset: 'photo-1542291026-7eec264c27ff', url: 'https://images.unsplash.com/photo-1622560481156-01fc7e1693e6?w=800&auto=format&fit=crop&q=80', alt: 'Sac à dos urbain noir sur fond clair' },
  { sku: 'MOD-002', category: 'mode', oldAsset: 'photo-1483985988355-763728e1935b', url: 'https://images.unsplash.com/photo-1603252109612-24fa03d145c8?w=800&auto=format&fit=crop&q=80', alt: 'Chemise blanche boutonnée' },
  { sku: 'MOD-003', category: 'mode', oldAsset: 'photo-1543163521-1bf539c55dd2', url: 'https://images.unsplash.com/photo-1605732440685-d0654d81aa30?w=800&auto=format&fit=crop&q=80', alt: 'Bottine noire en cuir' },
  { sku: 'MAI-001', category: 'maison', oldAsset: 'photo-1505693416388-ac5ce068fe85', url: 'https://images.unsplash.com/photo-1517991104123-1d56a6e81ed9?w=800&auto=format&fit=crop&q=80', alt: 'Lampe de table allumée' },
  { sku: 'MAI-002', category: 'maison', oldAsset: 'photo-1505693416388-ac5ce068fe85', url: 'https://images.unsplash.com/photo-1534889156217-d643df14f14a?w=800&auto=format&fit=crop&q=80', alt: 'Tapis décoratif devant un canapé' },
  { sku: 'ELE-003', category: 'electronique', oldAsset: 'photo-1585386959984-a4155224a1ad', url: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&auto=format&fit=crop&q=80', alt: 'Écouteurs sans fil et boîtier de charge' },
  { sku: 'ELE-004', category: 'electronique', oldAsset: 'photo-1583394838336-acd977736f90', url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80', alt: 'Adaptateur secteur blanc et câble de charge' },
  { sku: 'ACC-001', category: 'accessoires', oldAsset: 'photo-1521572267360-ee0c2909d518', url: 'https://images.unsplash.com/photo-1574365569389-a10d488ca3fb?w=800&auto=format&fit=crop&q=80', alt: 'Sac cabas réutilisable blanc' },
  { sku: 'MOD-004', category: 'mode', oldAsset: 'photo-1521572267360-ee0c2909d518', url: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800&auto=format&fit=crop&q=80', alt: 'T-shirt blanc à col rond' },
  { sku: 'MAI-005', category: 'maison', oldAsset: 'photo-1505693416388-ac5ce068fe85', url: 'https://images.unsplash.com/photo-1553114552-c4ece3a33c93?w=800&auto=format&fit=crop&q=80', alt: 'Coussins décoratifs sur un canapé' },
  { sku: 'ACC-004', category: 'accessoires', oldAsset: 'photo-1522335789203-aabd1fc54bc9', url: 'https://images.unsplash.com/photo-1580870069867-74c57ee1bb07?w=800&auto=format&fit=crop&q=80', alt: 'Ensemble de produits de soin pour la peau' },
  { sku: 'ELE-006', category: 'electronique', oldAsset: 'photo-1516321318423-f06f85e504b3', url: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=800&auto=format&fit=crop&q=80', alt: 'Projecteur LED en fonctionnement sur une table' },
  { sku: 'ACC-005', category: 'accessoires', oldAsset: 'photo-1556656793-08538906a9f8', url: 'https://images.unsplash.com/photo-1623393884989-cb3663e431c5?w=800&auto=format&fit=crop&q=80', alt: 'Étui de téléphone posé sur une table' },
  { sku: 'MAI-006', category: 'maison', oldAsset: 'photo-1505693416388-ac5ce068fe85', url: 'https://images.unsplash.com/photo-1642755623069-eb720c326553?w=800&auto=format&fit=crop&q=80', alt: 'Miroir au-dessus du lavabo dans une salle de bain' }
] as const;

type Snapshot = {
  _id: mongoose.Types.ObjectId;
  sku: string;
  name: string;
  price: number;
  stock: number;
  categoryId: mongoose.Types.ObjectId;
  images: Array<{ url: string; alt?: string }>;
};

async function main() {
  let connected = false;
  try {
    console.log(`Checking ${approvedImages.length} approved photo URLs before touching Atlas...`);
    for (const image of approvedImages) {
      const response = await fetch(image.url, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok || !contentType.toLowerCase().startsWith('image/')) {
        throw new Error(`Approved photo check failed for ${image.sku}: HTTP ${response.status}, content type ${contentType || 'missing'}. No database changes have been made.`);
      }
      console.log(`${image.sku}: image URL reachable (${response.status}, ${contentType.split(';')[0]}).`);
    }

    await connectDatabase();
    connected = true;
    if (mongoose.connection.name !== 'codealpha_ecommerce') {
      throw new Error('Connected database does not match codealpha_ecommerce; no product updates were made.');
    }

    const snapshots: Snapshot[] = [];
    for (const image of approvedImages) {
      const matches = await Product.find({ sku: image.sku }).select('_id sku name price stock categoryId images').lean();
      if (matches.length !== 1) throw new Error(`${image.sku}: expected exactly one product; no updates were made.`);
      const product = matches[0] as unknown as Snapshot;
      const category = await Category.findById(product.categoryId).select('slug').lean();
      if (category?.slug !== image.category) throw new Error(`${image.sku}: category did not match the approved proposal; no updates were made.`);
      if (!product.images.some((current) => current.url.includes(image.oldAsset))) {
        throw new Error(`${image.sku}: stored image changed since the approved audit; no updates were made.`);
      }
      snapshots.push(product);
    }

    console.log('Atlas preflight passed: exact 14 SKUs, expected categories and audited old asset IDs.');
    let updatedCount = 0;
    for (const image of approvedImages) {
      const snapshot = snapshots.find((item) => item.sku === image.sku)!;
      const result = await Product.updateOne(
        { _id: snapshot._id, sku: image.sku },
        { $set: { images: [{ url: image.url, alt: image.alt, isPrimary: true }] } }
      );
      if (result.matchedCount !== 1 || result.modifiedCount !== 1) {
        throw new Error(`${image.sku}: expected one changed images field, got matched=${result.matchedCount}, modified=${result.modifiedCount}.`);
      }
      updatedCount += 1;
      console.log(`${image.sku}: images field updated.`);
    }

    const verified = await Product.find({ sku: { $in: approvedImages.map((image) => image.sku) } })
      .select('_id sku name price stock categoryId images')
      .lean() as unknown as Snapshot[];
    if (verified.length !== approvedImages.length) throw new Error('Read-back count did not match the 14 approved products.');

    for (const image of approvedImages) {
      const after = verified.find((item) => item.sku === image.sku)!;
      const before = snapshots.find((item) => item.sku === image.sku)!;
      const category = await Category.findById(after.categoryId).select('slug').lean();
      if (after.images.length !== 1 || after.images[0].url !== image.url || after.images[0].alt !== image.alt || category?.slug !== image.category) {
        throw new Error(`${image.sku}: read-back image or category verification failed.`);
      }
      if (String(after._id) !== String(before._id) || after.name !== before.name || after.price !== before.price || after.stock !== before.stock || String(after.categoryId) !== String(before.categoryId)) {
        throw new Error(`${image.sku}: a protected product field changed unexpectedly.`);
      }
      console.log(`${image.sku}: read-back verified; name, price, stock and category unchanged; URL=${image.url}`);
    }

    console.log(`Atlas image update completed: ${updatedCount}/${approvedImages.length} approved images written and read back. No other fields or collections were targeted.`);
  } catch (error) {
    const code = (error as { code?: unknown })?.code;
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Approved image update stopped${code ? ` (code ${String(code)})` : ''}: ${message}`);
    process.exitCode = 1;
  } finally {
    if (connected || mongoose.connection.readyState !== 0) await disconnectDatabase();
  }
}

await main();
