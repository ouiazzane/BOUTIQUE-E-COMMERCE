import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import ProductCard from '../components/ProductCard';
import api from '../services/api';
import type { Category, Product } from '../types';
import { getCategoryCopy, getProductName } from '../utils/catalogText';
import { resolveMediaUrl } from '../utils/mediaUrl';

export default function HomePage() {
  const { data: heroProducts = [] } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const response = await api.get('/products/featured');
      return response.data.data as Product[];
    }
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data.data as Category[];
    }
  });

  return (
    <div className="space-y-16 pb-12">
      <section className="overflow-hidden rounded-[2rem] bg-slate-900 text-white shadow-2xl">
        <div className="grid gap-8 px-6 py-12 lg:grid-cols-2 lg:px-12 lg:py-16">
          <div className="flex flex-col justify-center">
            <span className="mb-4 inline-flex w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
              New collection
            </span>
            <h1 className="text-4xl font-bold leading-tight lg:text-6xl">Modern essentials for everyday living.</h1>
            <p className="mt-5 max-w-xl text-lg text-slate-300">Discover quality products, considered design, and a seamless shopping experience.</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/products" className="rounded-full bg-white px-6 py-3 font-semibold text-slate-900">Explore the shop</Link>
              <Link to="/products?featured=true" className="rounded-full border border-white/20 px-6 py-3 font-semibold text-white">Popular products</Link>
            </div>
          </div>
          <div className="rounded-[2rem] bg-gradient-to-br from-sky-500 to-indigo-700 p-4">
            <img
              src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80"
              alt="Modern workspace"
              className="h-full min-h-[320px] w-full rounded-[1.5rem] object-cover"
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-3xl font-bold text-slate-900">Categories</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {categories.map((category) => (
            <Link key={category._id} to={`/products?category=${category.slug}`} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <img src={resolveMediaUrl(category.image || 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80')} alt={getCategoryCopy(category).name} className="h-48 w-full object-cover" />
              <div className="p-4">
                <h3 className="text-xl font-semibold text-slate-900">{getCategoryCopy(category).name}</h3>
                <p className="mt-2 text-sm text-slate-600">{getCategoryCopy(category).description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-3xl font-bold text-slate-900">Popular products</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {heroProducts.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-3xl font-bold text-slate-900">Why shop with us?</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            ['Fast shipping', 'Orders are carefully prepared and dispatched quickly.'],
            ['Quality checked', 'Every product is reviewed before it is listed.'],
            ['Customer care', 'Our team is here to help with every purchase.']
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-3 text-sm text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
