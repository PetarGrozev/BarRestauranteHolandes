"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { ProductCategory } from '@/types';

const EditProductPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState<ProductCategory>('FOOD');
  const [orderTarget, setOrderTarget] = useState('KITCHEN');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/products/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(data => {
        setName(data.name);
        setDescription(data.description || '');
        setPrice(String(data.price));
        setImageUrl(data.imageUrl || '');
        setCategory(data.category);
        setOrderTarget(data.orderTarget);
      })
      .catch(() => alert('Producto no encontrado'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
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
      alert('Error al actualizar producto');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p>Cargando producto...</p>;

  return (
    <div className="form-page">
      <h1>Editar Producto</h1>
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
            {submitting ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <button className="btn-ghost" type="button" onClick={() => router.back()}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProductPage;
