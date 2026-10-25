import { Schema, model, type InferSchemaType } from 'mongoose';

const cartItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const cartSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: { type: [cartItemSchema], default: [] },
    mergedGuestCartIds: { type: [String], default: [] }
  },
  { timestamps: true, optimisticConcurrency: true }
);

export type CartDocument = InferSchemaType<typeof cartSchema>;

const Cart = model<CartDocument>('Cart', cartSchema);
export default Cart;
