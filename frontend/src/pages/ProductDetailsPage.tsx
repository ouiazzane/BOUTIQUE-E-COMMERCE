import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import ProductCard from '../components/ProductCard';
import CatalogProductImage from '../components/CatalogProductImage';
import { useAppContext } from '../contexts/AppContext';
import api from '../services/api';
import type { Product } from '../types';
import { getUsableProductImages } from '../utils/productImages';
import { getCategoryCopy, getProductDescription, getProductName } from '../utils/catalogText';
import { formatMoney } from '../services/currency';

export default function ProductDetailsPage() {
  const { slug } = useParams();
  const { addToCart, authLoading } = useAppContext();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const response = await api.get(`/products/${slug}`);
      return response.data.data as Product;
    }
  });

  const { data: related = [] } = useQuery({
    queryKey: ['related-products', data?._id],
    enabled: Boolean(data?._id),
    queryFn: async () => {
      const response = await api.get(`/products/${data?._id}/related`);
      return response.data.data as Product[];
    }
  });

  if (isLoading) return <p className="text-slate-500">Loading product…</p>;
  if (isError || !data) return <p className="text-red-600">Product not found.</p>;

  const images = getUsableProductImages(data);
  const selectedImageUrl = images[selectedImage]?.url;

  const onAddToCart = () => {
    if (authLoading) return;
    addToCart(data, quantity);
  };

  return (
    <div className="space-y-10">
      <section className="grid gap-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:grid-cols-2">
        <div>
          {selectedImageUrl
            ? <CatalogProductImage product={data} imageUrl={selectedImageUrl} className="h-[500px] w-full rounded-2xl object-cover" />
            : <CatalogProductImage product={data} className="h-[500px] w-full rounded-2xl object-cover" />}
          {images.length > 1 && <div className="mt-4 grid grid-cols-4 gap-3">
            {images.map((image, index) => (
              <button key={index} type="button" onClick={() => setSelectedImage(index)} className={`overflow-hidden rounded-xl border ${selectedImage === index ? 'border-slate-900' : 'border-slate-200'}`}>
                <CatalogProductImage product={data} imageUrl={image.url} className="h-20 w-full object-cover" />
              </button>
            ))}
          </div>}
        </div>

        <div className="flex flex-col justify-center">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{getCategoryCopy(typeof data.categoryId === 'string' ? data.categoryId : data.categoryId).name}</span>
          <h1 className="mt-3 text-4xl font-bold text-slate-900">{getProductName(data.sku, data.name)}</h1>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-3xl font-bold text-slate-900">{formatMoney(data.price)}</span>
            {data.compareAtPrice && data.compareAtPrice > data.price && <span className="text-lg text-slate-400 line-through">{formatMoney(data.compareAtPrice)}</span>}
          </div>
          <p className="mt-5 text-slate-600">{getProductDescription(data.sku, data.description)}</p>

          <div className="mt-6 flex items-center gap-4">
            <label className="text-sm font-medium text-slate-700">Quantity</label>
            <input
              type="number"
              min={1}
              max={data.stock}
              value={quantity}
              onChange={(event) => setQuantity(Math.min(Math.max(1, Number(event.target.value) || 1), data.stock || 1))}
              className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-center"
            />
          </div>

          <button
            type="button"
            onClick={onAddToCart}
            disabled={data.stock <= 0 || authLoading}
            className="mt-8 rounded-full bg-slate-900 px-6 py-3 font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {authLoading ? 'Checking session…' : data.stock > 0 ? 'Add to cart' : 'Out of stock'}
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-3xl font-bold text-slate-900">You may also like</h2>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {related.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
