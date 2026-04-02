import type { MenuCourseType } from '@/types';

export const MENU_COURSE_OPTIONS: Array<{ value: MenuCourseType; label: string; description: string }> = [
  { value: 'STARTER', label: 'Entrante', description: 'Primera elección del menú.' },
  { value: 'MAIN', label: 'Principal', description: 'Plato fuerte del menú.' },
  { value: 'DESSERT', label: 'Postre', description: 'Cierre dulce del menú.' },
  { value: 'DRINK', label: 'Bebida', description: 'Bebida incluida en el menú.' },
];

export const MENU_COURSE_LABELS: Record<MenuCourseType, string> = {
  STARTER: 'Entrante',
  MAIN: 'Principal',
  DESSERT: 'Postre',
  DRINK: 'Bebida',
};

export function getDefaultCourseLabel(courseType: MenuCourseType) {
  return MENU_COURSE_LABELS[courseType];
}
