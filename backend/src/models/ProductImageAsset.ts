import { Schema, model, type InferSchemaType } from 'mongoose';

const productImageAssetSchema = new Schema(
  {
    contentType: { type: String, enum: ['image/jpeg', 'image/png', 'image/webp'], required: true },
    data: { type: Buffer, required: true }
  },
  { timestamps: true }
);

export type ProductImageAssetDocument = InferSchemaType<typeof productImageAssetSchema>;

const ProductImageAsset = model<ProductImageAssetDocument>('ProductImageAsset', productImageAssetSchema);
export default ProductImageAsset;
