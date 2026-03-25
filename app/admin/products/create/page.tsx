"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProductCategory } from '@/types';

const CreateProductPage = () => {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState<ProductCategory>('FOOD');
  const [orderTarget, setOrderTarget] = useState('KITCHEN');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          price: parseFloat(price),
          image: imageUrl || undefined,
          category,
          orderDestination: orderTarget.toLowerCase(),
        }),
      });
      if (!res.ok) throw new Error('Failed');
      router.push('/admin/products');
    } catch {
      alert('Error al crear producto');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="form-page">
      <h1>Nuevo Producto</h1>
      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-field">
          <label>Nombre</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div className="form-field">
          <label>Descripción</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Precio (€)</label>
          <input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} required />
        </div>
        <div className="form-field">
          <label>URL de Imagen</label>
          <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div className="form-field">
          <label>Categoría</label>
          <select value={category} onChange={e => setCategory(e.target.value as ProductCategory)}>
            <option value="FOOD">Comida</option>
            <option value="DRINK">Bebida</option>
          </select>
        </div>
        <div className="form-field">
          <label>Destino del Pedido</label>
          <select value={orderTarget} onChange={e => setOrderTarget(e.target.value)}>
            <option value="KITCHEN">Cocina</option>
            <option value="STAFF">Sala</option>
            <option value="BOTH">Ambos</option>
          </select>
        </div>
        <div className="form-actions">
          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Creando...' : 'Crear Producto'}
          </button>
          <button className="btn-ghost" type="button" onClick={() => router.back()}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateProductPage;
