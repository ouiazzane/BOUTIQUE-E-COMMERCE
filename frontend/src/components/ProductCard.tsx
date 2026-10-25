import { ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useAppContext } from '../contexts/AppContext';
import CatalogProductImage from './CatalogProductImage';
import type { Product } from '../types';
import { getProductName, getProductShortDescription } from '../utils/catalogText';
import { formatMoney } from '../services/currency';

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart, authLoading } = useAppContext();

  const onAddToCart = () => {
    if (authLoading) return;
    addToCart(product, 1);
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white card-shadow">
      <Link to={`/products/${product.slug}`} className="block overflow-hidden" aria-label={getProductName(product.sku, product.name)}>
        <CatalogProductImage product={product} className="h-64 w-full object-cover transition duration-300 hover:scale-105" />
      </Link>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">{product.sku}</span>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Sale</span>
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900">{getProductName(product.sku, product.name)}</h3>
          <p className="mt-2 line-clamp-2 text-sm text-slate-600">{getProductShortDescription(product.sku, product.shortDescription)}</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-slate-900">{formatMoney(product.price)}</span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-sm text-slate-400 line-through">{formatMoney(product.compareAtPrice)}</span>
            )}
          </div>
          <span className="text-xs text-slate-500">{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</span>
        </div>

        <div className="flex gap-2">
          <Link to={`/products/${product.slug}`} className="flex-1 rounded-full border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700">
            View product
          </Link>
          <button
            type="button"
            onClick={onAddToCart}
            disabled={product.stock <= 0 || authLoading}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <ShoppingCart className="h-4 w-4" />
            {authLoading ? 'Checking…' : 'Add to cart'}
          </button>
        </div>
      </div>
    </article>
  );
}
