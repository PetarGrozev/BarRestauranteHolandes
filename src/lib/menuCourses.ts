import type { MenuCourseType } from '@/types';

export const MENU_COURSE_OPTIONS: Array<{ value: MenuCourseType; label: string; description: string }> = [
  { value: 'STARTER', label: 'Voorgerecht', description: 'Eerste keuze van het menu.' },
  { value: 'MAIN', label: 'Hoofdgerecht', description: 'Hoofdgerecht van het menu.' },
  { value: 'DESSERT', label: 'Dessert', description: 'Zoete afsluiting van het menu.' },
  { value: 'DRINK', label: 'Drank', description: 'Drank inbegrepen in het menu.' },
];

export const MENU_COURSE_LABELS: Record<MenuCourseType, string> = {
  STARTER: 'Voorgerecht',
  MAIN: 'Hoofdgerecht',
  DESSERT: 'Dessert',
  DRINK: 'Drank',
};

export function getDefaultCourseLabel(courseType: MenuCourseType) {
  return MENU_COURSE_LABELS[courseType];
}
