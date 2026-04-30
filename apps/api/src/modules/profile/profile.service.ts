import { Prisma } from '@prisma/client';
import { AppError } from '../../shared/middleware/error.middleware';
import {
  calculateTDEE,
  calculateMacros,
  getAgeFromDate,
  type ActivityLevel,
  type GoalType,
  type Sex,
} from '../../shared/utils/harris-benedict';
import { profileRepository } from './profile.repository';

export interface ProfileInput {
  name?:                string;
  birthDate?:           Date;
  sex?:                 Sex;
  heightCm?:            number;
  weightKg?:            number;
  goalWeightKg?:        number;
  goalType?:            GoalType;
  activityLevel?:       ActivityLevel;
  mealsPerDay?:         number;
  dietaryRestrictions?: string[];
  mealSchedule?:        string;
  observations?:        string;
}

interface Metrics {
  bmrCalculated:  number;
  tdeeCalculated: number;
  macrosJson:     Prisma.InputJsonValue;
}

function computeMetrics(profile: Partial<ProfileInput>): Metrics | Record<string, never> {
  const { weightKg, heightCm, birthDate, sex, activityLevel, goalType } = profile;
  if (!weightKg || !heightCm || !birthDate || !sex || !activityLevel) return {};

  const age    = getAgeFromDate(birthDate);
  const result = calculateTDEE(weightKg, heightCm, age, sex, activityLevel);
  const macros = calculateMacros(result.tdee, weightKg, goalType ?? 'maintain');

  return { bmrCalculated: result.bmr, tdeeCalculated: result.tdee, macrosJson: macros as unknown as Prisma.InputJsonValue };
}

// Strip DB nulls so Prisma model fields merge cleanly with ProfileInput (null vs undefined mismatch).
function toProfileInput(record: Awaited<ReturnType<typeof profileRepository.findByUserId>>): Partial<ProfileInput> {
  if (!record) return {};
  return {
    name:                record.name          ?? undefined,
    birthDate:           record.birthDate     ?? undefined,
    sex:                 (record.sex          as Sex | null)          ?? undefined,
    heightCm:            record.heightCm      ?? undefined,
    weightKg:            record.weightKg      ?? undefined,
    goalWeightKg:        record.goalWeightKg  ?? undefined,
    goalType:            (record.goalType     as GoalType | null)     ?? undefined,
    activityLevel:       (record.activityLevel as ActivityLevel | null) ?? undefined,
    mealsPerDay:         record.mealsPerDay   ?? undefined,
    dietaryRestrictions: record.dietaryRestrictions ?? undefined,
    mealSchedule:        record.mealSchedule  ?? undefined,
    observations:        record.observations  ?? undefined,
  };
}

export const profileService = {
  async get(userId: string) {
    const profile = await profileRepository.findByUserId(userId);
    if (!profile) throw new AppError(404, 'Perfil no encontrado', 'PROFILE_NOT_FOUND');
    return profile;
  },

  async upsert(userId: string, input: ProfileInput) {
    const metrics = computeMetrics(input);
    return profileRepository.upsert(userId, { ...input, ...metrics });
  },

  async patch(userId: string, input: ProfileInput) {
    const existing = await profileRepository.findByUserId(userId);
    const merged   = { ...toProfileInput(existing), ...input };
    const metrics  = computeMetrics(merged);
    return profileRepository.upsert(userId, { ...input, ...metrics });
  },

  async getMacros(userId: string) {
    const profile = await profileRepository.findByUserId(userId);
    if (!profile) throw new AppError(404, 'Perfil no encontrado', 'PROFILE_NOT_FOUND');

    if (!profile.bmrCalculated || !profile.tdeeCalculated) {
      throw new AppError(
        422,
        'El perfil no tiene datos suficientes para calcular métricas (faltan peso, altura, fecha de nacimiento, sexo o nivel de actividad)',
        'METRICS_UNAVAILABLE',
      );
    }

    return {
      bmr:    profile.bmrCalculated,
      tdee:   profile.tdeeCalculated,
      macros: profile.macrosJson,
    };
  },
};
