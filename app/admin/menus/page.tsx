"use client";

import { useEffect, useMemo, useState } from 'react';
import AppToastStack from '@/components/AppToast';
import ConfirmDialog from '@/components/ConfirmDialog';
import useAppToasts from '@/hooks/useAppToasts';
import { getDefaultCourseLabel, MENU_COURSE_LABELS, MENU_COURSE_OPTIONS } from '@/lib/menuCourses';
import type { Menu, MenuCourseType, Product } from '@/types';

type CourseDraft = {
  courseType: MenuCourseType;
  label: string;
  productIds: number[];
};

function buildEmptyCourse(courseType: MenuCourseType): CourseDraft {
  return {
    courseType,
    label: getDefaultCourseLabel(courseType),
    productIds: [],
  };
}

function sortProducts(products: Product[]) {
  return [...products].sort((left, right) => left.name.localeCompare(right.name, 'es-ES', { sensitivity: 'base' }));
}

export default function AdminMenusPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [editingMenuId, setEditingMenuId] = useState<number | null>(null);
  const [menuPendingDeletion, setMenuPendingDeletion] = useState<Menu | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [courses, setCourses] = useState<CourseDraft[]>([buildEmptyCourse('STARTER'), buildEmptyCourse('MAIN')]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toasts, pushToast, removeToast } = useAppToasts();

  const loadMenus = async () => {
    const response = await fetch('/api/menus');
    if (!response.ok) {
      throw new Error('No se pudieron cargar los menus.');
    }

    setMenus((await response.json()) as Menu[]);
  };

  const loadProducts = async () => {
    const response = await fetch('/api/products');
    if (!response.ok) {
      throw new Error('No se pudieron cargar los productos.');
    }

    setProducts((await response.json()) as Product[]);
  };

  useEffect(() => {
    Promise.all([loadMenus(), loadProducts()]).catch(() => {
      pushToast({ title: 'Menus', message: 'No se pudieron cargar los datos iniciales.', variant: 'error' });
    });
  }, []);

  const availableCourseTypes = useMemo(() => {
    const selected = new Set(courses.map(course => course.courseType));
    return MENU_COURSE_OPTIONS.filter(option => !selected.has(option.value));
  }, [courses]);

  const sortedProducts = useMemo(() => sortProducts(products), [products]);

  const resetForm = () => {
    setEditingMenuId(null);
    setName('');
    setDescription('');
    setIsActive(true);
    setCourses([buildEmptyCourse('STARTER'), buildEmptyCourse('MAIN')]);
  };

  const handleEdit = (menu: Menu) => {
    setEditingMenuId(menu.id);
    setName(menu.name);
    setDescription(menu.description ?? '');
    setIsActive(menu.isActive);
    setCourses(
      [...menu.courses]
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map(course => ({
          courseType: course.courseType,
          label: course.label,
          productIds: course.options.map(option => option.id),
        })),
    );
  };

  const updateCourse = (courseType: MenuCourseType, nextCourse: Partial<CourseDraft>) => {
    setCourses(prev =>
      prev.map(course => (course.courseType === courseType ? { ...course, ...nextCourse } : course)),
    );
  };

  const toggleCourseProduct = (courseType: MenuCourseType, productId: number) => {
    setCourses(prev =>
      prev.map(course => {
        if (course.courseType !== courseType) {
          return course;
        }

        const exists = course.productIds.includes(productId);
        return {
          ...course,
          productIds: exists ? course.productIds.filter(id => id !== productId) : [...course.productIds, productId],
        };
      }),
    );
  };

  const addCourse = (courseType: MenuCourseType) => {
    setCourses(prev => [...prev, buildEmptyCourse(courseType)]);
  };

  const removeCourse = (courseType: MenuCourseType) => {
    setCourses(prev => prev.filter(course => course.courseType !== courseType));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const hasEmptyCourse = courses.some(course => course.productIds.length === 0 || !course.label.trim());
    if (!name.trim() || courses.length === 0 || hasEmptyCourse) {
      pushToast({ title: 'Menus', message: 'Completa el nombre y al menos una opción por cada bloque del menu.', variant: 'error' });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(editingMenuId ? `/api/menus/${editingMenuId}` : '/api/menus', {
        method: editingMenuId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          isActive,
          courses: courses.map((course, index) => ({
            courseType: course.courseType,
            label: course.label.trim() || MENU_COURSE_LABELS[course.courseType],
            productIds: course.productIds,
            sortOrder: index,
          })),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? 'No se pudo guardar el menu.');
      }

      await loadMenus();
      resetForm();
      pushToast({ title: 'Menus', message: editingMenuId ? 'Menu actualizado.' : 'Menu creado correctamente.', variant: 'success' });
    } catch (error) {
      pushToast({
        title: 'Menus',
        message: error instanceof Error ? error.message : 'No se pudo guardar el menu.',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!menuPendingDeletion) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/menus/${menuPendingDeletion.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? 'No se pudo borrar el menu.');
      }

      await loadMenus();
      if (editingMenuId === menuPendingDeletion.id) {
        resetForm();
      }
      setMenuPendingDeletion(null);
      pushToast({ title: 'Menus', message: 'Menu eliminado.', variant: 'success' });
    } catch (error) {
      pushToast({ title: 'Menus', message: error instanceof Error ? error.message : 'No se pudo borrar el menu.', variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="form-page menu-admin-page">
      <div className="product-form-header">
        <h1>Menus</h1>
        <p className="page-subtitle">Configura menus flexibles: puedes crear uno completo con entrante, principal, postre y bebida, o dejar solo los bloques que quieras.</p>
      </div>

      <div className="menu-admin-layout">
        <form className="form-card menu-admin-form" onSubmit={handleSubmit}>
          <div className="product-form-grid">
            <div className="form-field product-form-field--wide">
              <label>Nombre del menu</label>
              <input type="text" value={name} onChange={event => setName(event.target.value)} placeholder="Ejemplo: Menu del dia" required />
            </div>
            <div className="form-field product-form-field--wide">
              <label>Descripción</label>
              <textarea value={description} onChange={event => setDescription(event.target.value)} rows={3} placeholder="Texto corto para explicar el estilo del menu o cuándo se sirve." />
            </div>
            <div className="form-field">
              <label>Estado</label>
              <select value={isActive ? 'active' : 'inactive'} onChange={event => setIsActive(event.target.value === 'active')}>
                <option value="active">Activo</option>
                <option value="inactive">Oculto</option>
              </select>
            </div>
          </div>

          <div className="menu-admin-course-toolbar">
            <h2>Bloques del menu</h2>
            <div className="menu-admin-course-adders">
              {availableCourseTypes.map(option => (
                <button key={option.value} className="btn-ghost" type="button" onClick={() => addCourse(option.value)}>
                  + {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="menu-admin-course-list">
            {courses.map(course => (
              <section key={course.courseType} className="menu-admin-course-card">
                <div className="menu-admin-course-header">
                  <div>
                    <strong>{MENU_COURSE_LABELS[course.courseType]}</strong>
                    <p>{MENU_COURSE_OPTIONS.find(option => option.value === course.courseType)?.description}</p>
                  </div>
                  {courses.length > 1 && (
                    <button className="btn-ghost" type="button" onClick={() => removeCourse(course.courseType)}>
                      Quitar bloque
                    </button>
                  )}
                </div>

                <div className="form-field">
                  <label>Título visible para el cliente</label>
                  <input
                    type="text"
                    value={course.label}
                    onChange={event => updateCourse(course.courseType, { label: event.target.value })}
                    placeholder={MENU_COURSE_LABELS[course.courseType]}
                  />
                </div>

                <div className="menu-admin-option-grid">
                  {sortedProducts.map(product => {
                    const checked = course.productIds.includes(product.id);
                    return (
                      <label key={`${course.courseType}-${product.id}`} className={`menu-admin-option${checked ? ' is-selected' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCourseProduct(course.courseType, product.id)}
                        />
                        <div>
                          <strong>{product.name}</strong>
                          <span>
                            {product.category === 'DRINK' ? 'Bebida' : 'Comida'} · {product.price.toFixed(2)} €
                            {!product.isEnabled ? ' · deshabilitado' : ''}
                            {product.stock <= 0 ? ' · sin stock' : ''}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="form-actions product-form-actions">
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? 'Guardando...' : editingMenuId ? 'Actualizar menu' : 'Crear menu'}
            </button>
            <button className="btn-ghost" type="button" onClick={resetForm}>
              {editingMenuId ? 'Cancelar edición' : 'Limpiar'}
            </button>
          </div>
        </form>

        <aside className="menu-admin-sidebar">
          <div className="form-card menu-admin-summary-card">
            <h2>Menus creados</h2>
            <p className="page-subtitle">Pulsa editar para reutilizar la configuración. El cliente solo verá los menús activos.</p>
            <div className="menu-admin-summary-list">
              {menus.length > 0 ? (
                menus.map(menu => (
                  <article key={menu.id} className="menu-admin-summary-item">
                    <div className="menu-admin-summary-copy">
                      <div className="menu-admin-summary-topline">
                        <strong>{menu.name}</strong>
                        <span className={`menu-admin-status${menu.isActive ? ' is-active' : ''}`}>{menu.isActive ? 'Activo' : 'Oculto'}</span>
                      </div>
                      {menu.description && <p>{menu.description}</p>}
                      <ul>
                        {menu.courses.map(course => (
                          <li key={course.id}>{course.label}: {course.options.length} opciones</li>
                        ))}
                      </ul>
                    </div>
                    <div className="menu-admin-summary-actions">
                      <button className="btn-secondary" type="button" onClick={() => handleEdit(menu)}>Editar</button>
                      <button className="btn-ghost" type="button" onClick={() => setMenuPendingDeletion(menu)}>Borrar</button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <p>Todavía no has creado ningún menu.</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(menuPendingDeletion)}
        title="Eliminar menu"
        message={menuPendingDeletion ? `¿Seguro que quieres borrar el menu ${menuPendingDeletion.name}?` : ''}
        confirmLabel={deleting ? 'Borrando...' : 'Sí, borrar menu'}
        cancelLabel="Cancelar"
        confirmVariant="danger"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setMenuPendingDeletion(null)}
      />

      <AppToastStack toasts={toasts} onClose={removeToast} />
    </div>
  );
}
