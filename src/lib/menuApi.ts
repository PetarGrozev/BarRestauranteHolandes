import type { MenuCourseType } from '../types';
import { getDefaultCourseLabel } from './menuCourses';

export type MenuCoursePayload = {
  courseType: MenuCourseType;
  label: string;
  productIds: number[];
};

export function normalizeMenuPayload(body: unknown) {
  const payload = body as {
    name?: unknown;
    description?: unknown;
    isActive?: unknown;
    courses?: unknown;
  };

  const name = typeof payload?.name === 'string' ? payload.name.trim() : '';
  const description = typeof payload?.description === 'string' ? payload.description.trim() : '';
  const isActive = typeof payload?.isActive === 'boolean' ? payload.isActive : null;

  if (!name || isActive === null || !Array.isArray(payload?.courses) || payload.courses.length === 0) {
    return null;
  }

  const validCourseTypes: MenuCourseType[] = ['STARTER', 'MAIN', 'DESSERT', 'DRINK'];

  const courses = payload.courses.map((course, index) => {
    const item = course as {
      courseType?: unknown;
      label?: unknown;
      productIds?: unknown;
    };

    const courseType = String(item.courseType).toUpperCase() as MenuCourseType;
    const labelSource = typeof item.label === 'string' ? item.label.trim() : '';
    const productIds = Array.isArray(item.productIds)
      ? item.productIds.map(value => Number(value)).filter(value => Number.isInteger(value) && value > 0)
      : [];

    return {
      courseType,
      label: labelSource || (validCourseTypes.includes(courseType) ? getDefaultCourseLabel(courseType) : ''),
      productIds: Array.from(new Set(productIds)),
      sortOrder: index,
    };
  });

  const hasValidCourses =
    courses.length > 0 &&
    courses.every(course => validCourseTypes.includes(course.courseType) && course.label.length > 0 && course.productIds.length > 0);

  const uniqueCourseTypeCount = new Set(courses.map(course => course.courseType)).size;

  if (!hasValidCourses || uniqueCourseTypeCount !== courses.length) {
    return null;
  }

  return {
    name,
    description: description || null,
    isActive,
    courses,
  };
}

export function formatMenu(menu: {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  courses: Array<{
    id: number;
    menuId: number;
    courseType: MenuCourseType;
    label: string;
    sortOrder: number;
    products: Array<{
      product: {
        id: number;
        name: string;
        description: string | null;
        price: number;
        stock: number;
        isEnabled: boolean;
        imageUrl: string | null;
        category: 'FOOD' | 'DRINK';
        orderTarget: 'KITCHEN' | 'STAFF' | 'BOTH';
        createdAt: Date;
        updatedAt: Date;
      };
    }>;
  }>;
}) {
  return {
    id: menu.id,
    name: menu.name,
    description: menu.description,
    isActive: menu.isActive,
    createdAt: menu.createdAt,
    updatedAt: menu.updatedAt,
    courses: [...menu.courses]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map(course => ({
        id: course.id,
        menuId: course.menuId,
        courseType: course.courseType,
        label: course.label,
        sortOrder: course.sortOrder,
        options: course.products.map(item => item.product),
      })),
  };
}
