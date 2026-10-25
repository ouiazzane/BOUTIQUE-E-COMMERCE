import { Schema, model, type InferSchemaType } from 'mongoose';

const productImageSchema = new Schema(
  {
    url: { type: String, required: true },
    alt: { type: String, default: '' },
    publicId: { type: String, default: '' },
    isPrimary: { type: Boolean, default: false }
  },
  { _id: false }
);

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true, index: true },
    shortDescription: { type: String, default: '' },
    description: { type: String, default: '' },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, default: null },
    sku: { type: String, required: true, unique: true, index: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
    images: { type: [productImageSchema], default: [] },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export type ProductDocument = InferSchemaType<typeof productSchema>;

const Product = model<ProductDocument>('Product', productSchema);
export default Product;
