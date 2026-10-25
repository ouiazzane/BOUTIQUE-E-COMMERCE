import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, ImagePlus, Pencil, Plus, Search, Upload, X } from 'lucide-react';

import api from '../../services/api';
import type { Category } from '../../types';
import { getCategoryCopy } from '../../utils/catalogText';
import { resolveMediaUrl } from '../../utils/mediaUrl';

type AdminCategory = Category & { productCount: number };
type CategoryForm = { name: string; slug: string; description: string; image: string };
type ImageSource = 'device' | 'url';
const blankForm: CategoryForm = { name: '', slug: '', description: '', image: '' };
const toSlug = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const errorMessage = (error: unknown) => (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'The request failed.';

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [form, setForm] = useState<CategoryForm>(blankForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSource, setImageSource] = useState<ImageSource>('device');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const categoriesQuery = useQuery({ queryKey: ['admin-categories'], queryFn: async () => (await api.get('/admin/categories')).data.data as AdminCategory[] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      let image = form.image.trim();
      if (imageFile) {
        const uploadData = new FormData();
        uploadData.append('image', imageFile);
        const uploadResponse = await api.post('/products/images', uploadData);
        image = uploadResponse.data.data.url as string;
      }
      const payload = { ...form, image };
      return editing ? api.patch(`/categories/${editing._id}`, payload) : api.post('/categories', payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      await queryClient.invalidateQueries({ queryKey: ['categories-store'] });
      setNotice(editing ? 'Category updated.' : 'Category created.'); setError(''); closeForm();
    }, onError: (mutationError) => setError(errorMessage(mutationError))
  });
  const deactivateMutation = useMutation({
    mutationFn: (category: AdminCategory) => api.delete(`/categories/${category._id}`),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['admin-categories'] }); await queryClient.invalidateQueries({ queryKey: ['categories'] }); await queryClient.invalidateQueries({ queryKey: ['categories-store'] }); setNotice('Category deactivated.'); },
    onError: (mutationError) => setError(errorMessage(mutationError))
  });

  const categories = categoriesQuery.data ?? [];
  const filtered = useMemo(() => categories.filter((item) => `${item.name} ${item.slug}`.toLowerCase().includes(search.toLowerCase())), [categories, search]);
  function closeForm() { setFormOpen(false); setEditing(null); setForm(blankForm); setImageFile(null); setImageSource('device'); setError(''); }
  function create() { setEditing(null); setForm(blankForm); setFormOpen(true); setImageFile(null); setImageSource('device'); setError(''); setNotice(''); }
  function edit(category: AdminCategory) { const image = category.image ?? ''; const copy = getCategoryCopy(category); setEditing(category); setForm({ name: copy.name, slug: category.slug, description: copy.description, image }); setFormOpen(true); setImageFile(null); setImageSource(image.startsWith('http') ? 'url' : 'device'); setError(''); setNotice(''); }
  function submit(event: React.FormEvent) { event.preventDefault(); setError(''); saveMutation.mutate(); }

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-indigo-600">Catalog organization</p><h2 className="mt-1 text-3xl font-bold text-slate-950">Categories</h2><p className="mt-2 text-sm text-slate-500">Manage the departments shown in the shop.</p></div><button onClick={create} type="button" className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"><Plus className="h-4 w-4" />New category</button></div>
    {notice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}{error && !formOpen && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    {formOpen && <CategoryEditor form={form} editing={Boolean(editing)} saving={saveMutation.isPending} error={error} imageFile={imageFile} imageSource={imageSource} onChange={setForm} onImageFileChange={setImageFile} onImageSourceChange={(source) => { setImageSource(source); if (source === 'url') setImageFile(null); }} onCancel={closeForm} onSubmit={submit} />}
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-bold text-slate-900">All categories</h3><p className="text-sm text-slate-500">{categories.length} total · including inactive</p></div><label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search…" className="text-sm outline-none" /></label></div>
      {categoriesQuery.isLoading ? <p className="p-8 text-slate-500">Loading categories…</p> : categoriesQuery.isError ? <p role="alert" className="p-8 text-red-700">Could not load categories. Check your admin access.</p> : <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((category) => { const copy = getCategoryCopy(category); return <article key={category._id} className="overflow-hidden rounded-xl border border-slate-200"><div className="flex h-32 items-center justify-center bg-slate-100">{category.image ? <img src={resolveMediaUrl(category.image)} alt="" className="h-full w-full object-cover" /> : <Boxes className="h-8 w-8 text-slate-300" />}</div><div className="space-y-3 p-4"><div className="flex items-start justify-between gap-2"><div><h4 className="font-bold text-slate-900">{copy.name}</h4><p className="text-xs text-slate-500">/{category.slug}</p></div><span className={`rounded-full px-2 py-1 text-xs font-semibold ${category.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{category.isActive ? 'Active' : 'Inactive'}</span></div><p className="line-clamp-2 min-h-10 text-sm text-slate-600">{copy.description || 'No description.'}</p><div className="flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-xs text-slate-500">{category.productCount} product(s)</span><div className="flex gap-2"><button type="button" onClick={() => edit(category)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:text-indigo-700" aria-label={`Edit ${copy.name}`}><Pencil className="h-4 w-4" /></button>{category.isActive && <button type="button" onClick={() => { if (window.confirm(`Deactivate “${copy.name}”?`)) deactivateMutation.mutate(category); }} disabled={deactivateMutation.isPending} className="rounded-lg border border-red-100 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">Deactivate</button>}</div></div></div></article>;})}</div>}
      {!categoriesQuery.isLoading && !categoriesQuery.isError && filtered.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No matching categories.</p>}
    </section>
  </div>;
}

function CategoryEditor({ form, editing, saving, error, imageFile, imageSource, onChange, onImageFileChange, onImageSourceChange, onCancel, onSubmit }: { form: CategoryForm; editing: boolean; saving: boolean; error: string; imageFile: File | null; imageSource: ImageSource; onChange: (form: CategoryForm) => void; onImageFileChange: (file: File | null) => void; onImageSourceChange: (source: ImageSource) => void; onCancel: () => void; onSubmit: (event: React.FormEvent) => void }) {
  const [localPreview, setLocalPreview] = useState('');
  const set = (key: keyof CategoryForm, value: string) => onChange({ ...form, [key]: value });

  useEffect(() => {
    if (!imageFile) { setLocalPreview(''); return; }
    const objectUrl = URL.createObjectURL(imageFile);
    setLocalPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) onCancel(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel, saving]);

  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onCancel(); }}>
    <form onSubmit={onSubmit} role="dialog" aria-modal="true" aria-labelledby="category-editor-title" className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-7"><div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Catalog organization</p><h3 id="category-editor-title" className="mt-1 text-xl font-bold text-slate-950">{editing ? 'Edit category' : 'Add category'}</h3></div><button type="button" onClick={onCancel} disabled={saving} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50" aria-label="Close"><X className="h-5 w-5" /></button></div>
      <div className="space-y-5 overflow-y-auto p-5 sm:p-7">
        <p className="text-sm text-slate-500">Categories used by products cannot be deactivated.</p>
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Name *"><input value={form.name} onChange={(event) => { const name = event.target.value; onChange({ ...form, name, ...(!editing ? { slug: toSlug(name) } : {}) }); }} required minLength={2} maxLength={100} className={inputClass} /></Field><Field label="Slug *"><input value={form.slug} onChange={(event) => set('slug', event.target.value)} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className={inputClass} /></Field><Field label="Description"><textarea rows={3} maxLength={500} value={form.description} onChange={(event) => set('description', event.target.value)} className={inputClass} /></Field>
          <div className="space-y-2"><span className="block text-sm font-medium text-slate-700">Category image</span><div className="inline-flex rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => onImageSourceChange('device')} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${imageSource === 'device' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}><Upload className="h-4 w-4" />From my device</button><button type="button" onClick={() => onImageSourceChange('url')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${imageSource === 'url' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>From a URL</button></div>
            {imageSource === 'device' ? <label className="flex min-h-24 cursor-pointer items-center gap-4 rounded-xl border border-dashed border-slate-300 p-4 hover:border-indigo-400 hover:bg-indigo-50/40"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><ImagePlus className="h-5 w-5" /></span><span className="min-w-0"><span className="block text-sm font-semibold text-slate-800">{imageFile?.name ?? 'Choose a photo from your device'}</span><span className="mt-1 block text-xs text-slate-500">JPG, PNG or WebP, up to 5 MB</span></span><input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0] ?? null; onImageFileChange(file); if (file) set('image', ''); }} /></label> : <Field label="Image URL"><input type="url" value={form.image} onChange={(event) => { set('image', event.target.value); onImageFileChange(null); }} className={inputClass} placeholder="https://…" /></Field>}
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-3">{localPreview || form.image ? <img src={resolveMediaUrl(localPreview || form.image)} alt="Category image preview" className="h-20 w-24 rounded-lg object-cover" /> : <span className="flex h-20 w-24 items-center justify-center rounded-lg bg-white text-slate-300"><Boxes className="h-8 w-8" /></span>}<p className="text-sm text-slate-600">Preview of the image that will be saved for this category.</p></div>
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 sm:px-7"><button type="button" onClick={onCancel} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50">Cancel</button><button disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? (imageFile ? 'Uploading image…' : 'Saving…') : editing ? 'Save changes' : 'Create category'}</button></div>
    </form>
  </div>;
}

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-1.5 text-sm font-medium text-slate-700"><span>{label}</span>{children}</label>; }
