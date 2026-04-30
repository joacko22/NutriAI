// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthResponse {
  accessToken:  string;
  refreshToken: string;
  user: {
    id:    string;
    email: string;
    role:  string;
  };
}

// ─── Profile ──────────────────────────────────────────────────────────────────
export type GoalType      = 'fat_loss' | 'muscle_gain' | 'recomp' | 'maintain';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Sex           = 'male' | 'female';

export interface MacroTarget {
  calories: number;
  proteinG: number;
  carbsG:   number;
  fatG:     number;
}

export interface ProfileData {
  name?:               string;
  birthDate?:          string;
  sex?:                Sex;
  heightCm?:           number;
  weightKg?:           number;
  goalWeightKg?:       number;
  goalType?:           GoalType;
  activityLevel?:      ActivityLevel;
  mealsPerDay?:        number;
  dietaryRestrictions?:string[];
  mealSchedule?:       string;
  observations?:       string;
}

// ─── Body Records ─────────────────────────────────────────────────────────────
export interface BodyRecordData {
  weightKg:   number;
  bodyFatPct?:number;
  waistCm?:   number;
  neckCm?:    number;
  notes?:     string;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id:        string;
  role:      MessageRole;
  content:   string;
  createdAt: string;
}

// ─── Meal Plans ───────────────────────────────────────────────────────────────
export type MealType =
  | 'breakfast'
  | 'morning_snack'
  | 'lunch'
  | 'afternoon_snack'
  | 'dinner'
  | 'evening_snack';

export interface MealItemData {
  mealType:    MealType;
  optionLabel: 'A' | 'B';
  name:        string;
  description?:string;
  calories?:   number;
  proteinG?:   number;
  carbsG?:     number;
  fatG?:       number;
}
