import { api } from './client';
import type { MealType } from '@nutriai/shared';

export interface MealItem {
  id:          string;
  mealType:    MealType;
  optionLabel: 'A' | 'B';
  name:        string;
  description?: string;
  calories?:   number;
  proteinG?:   number;
  carbsG?:     number;
  fatG?:       number;
}

export interface MealDay {
  id:        string;
  dayNumber: number;
  dayName:   string;
  items:     MealItem[];
}

export interface MealPlan {
  id:        string;
  title:     string;
  weekStart: string;
  createdAt: string;
  days?:     MealDay[];
}

export const plansApi = {
  list:     ()           => api.get<MealPlan[]>('/api/v1/plans'),
  generate: ()           => api.post<MealPlan>('/api/v1/plans/generate', {}),
  get:      (id: string) => api.get<MealPlan>(`/api/v1/plans/${id}`),
  remove:   (id: string) => api.delete<void>(`/api/v1/plans/${id}`),
};
