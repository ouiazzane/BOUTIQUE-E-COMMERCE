import mongoose from 'mongoose';

import { connectDatabase, disconnectDatabase } from '../config/database.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import PasswordResetToken from '../models/PasswordResetToken.js';
import { env } from '../config/env.js';

const categoriesSeed = [
  { name: 'Électronique', slug: 'electronique', description: 'Dernières innovations techniques', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80' },
  { name: 'Mode', slug: 'mode', description: 'Style quotidien et tendance', image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=800&q=80' },
  { name: 'Maison', slug: 'maison', description: 'Éléments de confort et décoration', image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80' },
  { name: 'Accessoires', slug: 'accessoires', description: 'Petits détails qui font la différence', image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80' }
];

const productsSeed = [
  { name: 'Casque audio premium', slug: 'casque-audio-premium', shortDescription: 'Son immersif et confort optimal', description: 'Casque wireless avec réduction de bruit et autonomie de 30 heures.', categorySlug: 'electronique', price: 189, compareAtPrice: 249, sku: 'ELE-001', stock: 18, images: [{ url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80', alt: 'Casque audio premium', isPrimary: true }], isFeatured: true },
  { name: 'Montre connectée Pro', slug: 'montre-connectee-pro', shortDescription: 'Suivi sportif et notifications intelligentes', description: 'Montre connectée avec écran AMOLED, suivi du sommeil et GPS intégré.', categorySlug: 'electronique', price: 249, compareAtPrice: 299, sku: 'ELE-002', stock: 12, images: [{ url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80', alt: 'Montre connectée', isPrimary: true }], isFeatured: true },
  { name: 'Sac à dos urbain', slug: 'sac-a-dos-urbain', shortDescription: 'Design minimaliste et fonctionnel', description: 'Sac à dos léger avec compartiments multiples pour le quotidien.', categorySlug: 'mode', price: 79, compareAtPrice: 109, sku: 'MOD-001', stock: 15, images: [], isFeatured: true },
  { name: 'Chemise élégante', slug: 'chemise-elegante', shortDescription: 'Coupe classique pour toutes occasions', description: 'Chemise en coton premium conçue pour un style professionnel et chic.', categorySlug: 'mode', price: 59, compareAtPrice: 89, sku: 'MOD-002', stock: 21, images: [], isFeatured: false },
  { name: 'Lampe design', slug: 'lampe-design', shortDescription: 'Ambiance douce et moderne', description: 'Lampe minimaliste pour salon ou chambre avec lumière chaude.', categorySlug: 'maison', price: 89, compareAtPrice: 129, sku: 'MAI-001', stock: 10, images: [], isFeatured: true },
  { name: 'Tapis doux', slug: 'tapis-doux', shortDescription: 'Confort pour le salon', description: 'Tapis moelleux en fibres douillettes pour un intérieur chaleureux.', categorySlug: 'maison', price: 64, compareAtPrice: 95, sku: 'MAI-002', stock: 16, images: [], isFeatured: false },
  { name: 'Écouteurs sans fil', slug: 'ecouteurs-sans-fil', shortDescription: 'Portable et performant', description: 'Écouteurs compactes avec réduction de bruit, parfaite pour les déplacements.', categorySlug: 'electronique', price: 129, compareAtPrice: 179, sku: 'ELE-003', stock: 25, images: [], isFeatured: false },
  { name: 'Chargeur rapide USB-C', slug: 'chargeur-rapide-usb-c', shortDescription: 'Recharge rapide et fiable', description: 'Chargeur rapide pour smartphone, tablette et accessoires USB-C.', categorySlug: 'electronique', price: 39, compareAtPrice: 59, sku: 'ELE-004', stock: 30, images: [], isFeatured: false },
  { name: 'Mug en céramique', slug: 'mug-en-ceramique', shortDescription: 'Matériau élégant et durable', description: 'Mug premium pour café ou thé avec finition élégante.', categorySlug: 'maison', price: 24, compareAtPrice: 39, sku: 'MAI-003', stock: 42, images: [{ url: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=800&q=80', alt: 'Mug en céramique', isPrimary: true }], isFeatured: false },
  { name: 'Sac de course', slug: 'sac-de-course', shortDescription: 'Polyvalent et résistant', description: 'Sac de course pratique avec poche extérieure et fermoir sécurisé.', categorySlug: 'accessoires', price: 54, compareAtPrice: 75, sku: 'ACC-001', stock: 20, images: [], isFeatured: true },
  { name: 'Solaire portable', slug: 'solaire-portable', shortDescription: 'Alimentation mobile facile', description: 'Panneau solaire compact pour activité extérieure et secours.', categorySlug: 'accessoires', price: 99, compareAtPrice: 149, sku: 'ACC-002', stock: 8, images: [{ url: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=800&q=80', alt: 'Solaire portable', isPrimary: true }], isFeatured: false },
  { name: 'Bottines élégantes', slug: 'bottines-elegantes', shortDescription: 'Confort et élégance', description: 'Bottines en cuir souple avec semelle légère et durable.', categorySlug: 'mode', price: 119, compareAtPrice: 169, sku: 'MOD-003', stock: 11, images: [], isFeatured: true },
  { name: 'Bouilloire intelligente', slug: 'bouilloire-intelligente', shortDescription: 'Préchauffage précis', description: 'Bouilloire connectée à température réglable et design premium.', categorySlug: 'maison', price: 69, compareAtPrice: 99, sku: 'MAI-004', stock: 14, images: [], isFeatured: false },
  { name: 'T-shirt premium', slug: 't-shirt-premium', shortDescription: 'Coupe moderne', description: 'T-shirt en coton premium pour un look simple et confortable.', categorySlug: 'mode', price: 34, compareAtPrice: 49, sku: 'MOD-004', stock: 28, images: [{ url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80', alt: 'T-shirt premium', isPrimary: true }], isFeatured: false },
  { name: 'Clavier mécanique', slug: 'clavier-mecanique', shortDescription: 'Expérience de frappe optimale', description: 'Clavier mécanique compact pour bureau et gaming.', categorySlug: 'electronique', price: 109, compareAtPrice: 149, sku: 'ELE-005', stock: 9, images: [{ url: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=800&q=80', alt: 'Clavier mécanique', isPrimary: true }], isFeatured: true },
  { name: 'Pendentif lumineux', slug: 'pendentif-lumineux', shortDescription: 'Accessoire phare', description: 'Pendentif design à illumination douce pour soirées et looks urbains.', categorySlug: 'accessoires', price: 42, compareAtPrice: 67, sku: 'ACC-003', stock: 19, images: [], isFeatured: false },
  { name: 'Coussins de salon', slug: 'coussins-de-salon', shortDescription: 'Textures douillettes', description: 'Set de coussins pour renforcer le confort visuel de votre intérieur.', categorySlug: 'maison', price: 52, compareAtPrice: 76, sku: 'MAI-005', stock: 24, images: [], isFeatured: false },
  { name: 'Coffret de soins', slug: 'coffret-de-soins', shortDescription: 'Routine beauté quotidienne', description: 'Ensemble complet pour soins du visage et du corps.', categorySlug: 'accessoires', price: 46, compareAtPrice: 68, sku: 'ACC-004', stock: 18, images: [], isFeatured: false },
  { name: 'Projecteur mini', slug: 'projecteur-mini', shortDescription: 'Cinéma portable', description: 'Mini projecteur LED pour présenter clips et films en déplacement.', categorySlug: 'electronique', price: 149, compareAtPrice: 219, sku: 'ELE-006', stock: 7, images: [], isFeatured: true },
  { name: 'Etui de téléphone premium', slug: 'etui-de-telephone-premium', shortDescription: 'Protection élégante', description: 'Etui rigide en cuir avec protection renforcée sur les bords.', categorySlug: 'accessoires', price: 29, compareAtPrice: 44, sku: 'ACC-005', stock: 31, images: [], isFeatured: false },
  { name: 'Miroir de salle de bain', slug: 'miroir-salle-de-bain', shortDescription: 'Beauté et luminosité', description: 'Miroir de salle de bain avec éclairage doux et réglable.', categorySlug: 'maison', price: 94, compareAtPrice: 129, sku: 'MAI-006', stock: 13, images: [], isFeatured: false }
];

async function main() {
  let connected = false;

  try {
    if (!env.MONGODB_URI || /<[^>]+>/.test(env.MONGODB_URI)) {
      throw new Error('MONGODB_URI is missing or contains a placeholder.');
    }

    const authority = env.MONGODB_URI.slice(env.MONGODB_URI.indexOf('://') + 3).split(/[/?#]/, 1)[0] ?? '';
    const hosts = authority.slice(authority.lastIndexOf('@') + 1).split(',');
    if (!/^mongodb(?:\+srv)?:\/\//i.test(env.MONGODB_URI) || hosts.some((host) => !host.split(':')[0].endsWith('.mongodb.net'))) {
      throw new Error('Refusing to seed: the configured target is not a verified Atlas URI.');
    }

    await connectDatabase();
    connected = true;

    if (mongoose.connection.name !== 'codealpha_ecommerce') {
      throw new Error('Refusing to seed: connected database is not codealpha_ecommerce.');
    }

    const models = [Category, Product, User, Order, PasswordResetToken];
    const createdCollections: string[] = [];
    for (const currentModel of models) {
      const collectionName = currentModel.collection.name;
      const exists = await mongoose.connection.db!.listCollections({ name: collectionName }, { nameOnly: true }).hasNext();
      if (!exists) {
        await currentModel.createCollection();
        createdCollections.push(collectionName);
      }
      await currentModel.init();
    }

    let categoriesInserted = 0;
    let categoriesSkipped = 0;
    for (const category of categoriesSeed) {
      const existing = await Category.findOne({ slug: category.slug });
      if (existing) {
        categoriesSkipped += 1;
        continue;
      }
      try {
        await Category.create(category);
        categoriesInserted += 1;
      } catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error;
        categoriesSkipped += 1;
      }
    }

    const categories = await Category.find({ slug: { $in: categoriesSeed.map(({ slug }) => slug) } });
    const bySlug = new Map(categories.map((category) => [category.slug, category._id]));
    let productsInserted = 0;
    let productsSkipped = 0;
    for (const product of productsSeed) {
      const categoryId = bySlug.get(product.categorySlug);
      if (!categoryId) throw new Error(`Seed category missing for product slug ${product.slug}.`);

      const existing = await Product.findOne({ $or: [{ slug: product.slug }, { sku: product.sku }] });
      if (existing) {
        productsSkipped += 1;
        continue;
      }

      const { categorySlug: _categorySlug, ...productFields } = product;
      try {
        await Product.create({
          ...productFields,
          categoryId,
          isActive: true
        });
        productsInserted += 1;
      } catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error;
        productsSkipped += 1;
      }
    }

    console.log(`Atlas seed completed for ${mongoose.connection.name}.`);
    console.log(`Model collections ensured: ${models.map((currentModel) => currentModel.collection.name).join(', ')}.`);
    console.log(`Collections observed as newly created during this run: ${createdCollections.length ? createdCollections.join(', ') : 'none detected'}.`);
    console.log(`Categories: inserted ${categoriesInserted}, skipped ${categoriesSkipped}, updated 0.`);
    console.log(`Products: inserted ${productsInserted}, skipped ${productsSkipped}, updated 0.`);
    console.log(`Current counts: categories ${await Category.countDocuments()}, products ${await Product.countDocuments()}.`);
  } catch (error) {
    const code = (error as { code?: unknown })?.code;
    const safeCode = code ? ` (code ${String(code)})` : '';
    console.error(`Atlas seed failed${safeCode}. No existing document was intentionally updated or deleted.`);
    process.exitCode = 1;
  } finally {
    if (connected || mongoose.connection.readyState !== 0) {
      await disconnectDatabase();
    }
  }
}

main();
