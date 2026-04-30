// Harris-Benedict revisada (Roza & Shizgal, 1984)

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type GoalType      = 'fat_loss'  | 'muscle_gain' | 'recomp' | 'maintain';
export type Sex           = 'male'      | 'female';

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary:   1.2,
  light:       1.375,
  moderate:    1.55,
  active:      1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary:   'Sedentario (sin ejercicio)',
  light:       'Ligero (1–3 días/semana)',
  moderate:    'Moderado (3–5 días/semana)',
  active:      'Activo (6–7 días/semana)',
  very_active: 'Muy activo (atleta / trabajo físico)',
};

export interface MacroTarget {
  calories: number;
  proteinG: number;
  carbsG:   number;
  fatG:     number;
}

export interface TDEEResult {
  bmr:            number;
  tdee:           number;
  activityFactor: number;
  macros:         MacroTarget;
}

/**
 * Calcula el BMR con Harris-Benedict revisada.
 * Hombres: 88.362 + (13.397 × peso) + (4.799 × altura) - (5.677 × edad)
 * Mujeres: 447.593 + (9.247 × peso) + (3.098 × altura) - (4.330 × edad)
 */
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: Sex,
): number {
  if (sex === 'male') {
    return 88.362 + (13.397 * weightKg) + (4.799 * heightCm) - (5.677 * ageYears);
  }
  return 447.593 + (9.247 * weightKg) + (3.098 * heightCm) - (4.330 * ageYears);
}

/**
 * TDEE = BMR × factor de actividad
 */
export function calculateTDEE(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: Sex,
  activityLevel: ActivityLevel,
): TDEEResult {
  const factor = ACTIVITY_FACTORS[activityLevel];
  const bmr    = calculateBMR(weightKg, heightCm, ageYears, sex);
  const tdee   = Math.round(bmr * factor);

  return {
    bmr:            Math.round(bmr),
    tdee,
    activityFactor: factor,
    macros:         calculateMacros(tdee, weightKg, 'maintain'),
  };
}

/**
 * Distribución de macros según objetivo.
 * Proteína calculada en g/kg de peso corporal.
 * Grasas como % de calorías totales.
 * Carbos = calorías restantes.
 */
export function calculateMacros(
  tdee: number,
  weightKg: number,
  goal: GoalType,
): MacroTarget {
  const configs: Record<GoalType, { calFactor: number; proteinPerKg: number; fatPct: number }> = {
    fat_loss:    { calFactor: 0.80, proteinPerKg: 2.2, fatPct: 0.25 },
    muscle_gain: { calFactor: 1.12, proteinPerKg: 1.8, fatPct: 0.28 },
    recomp:      { calFactor: 1.00, proteinPerKg: 2.4, fatPct: 0.27 },
    maintain:    { calFactor: 1.00, proteinPerKg: 1.6, fatPct: 0.30 },
  };

  const c        = configs[goal];
  const calories = Math.round(tdee * c.calFactor);
  const proteinG = Math.round(weightKg * c.proteinPerKg);
  const fatG     = Math.round((calories * c.fatPct) / 9);
  const carbsG   = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));

  return { calories, proteinG, carbsG, fatG };
}

/**
 * Calcula edad exacta a partir de fecha de nacimiento.
 */
export function getAgeFromDate(birthDate: Date): number {
  const today = new Date();
  let age     = today.getFullYear() - birthDate.getFullYear();
  const m     = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}
