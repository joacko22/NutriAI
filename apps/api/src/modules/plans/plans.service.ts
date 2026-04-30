import { z }                from 'zod';
import { MealType }         from '@prisma/client';
import { AppError }         from '../../shared/middleware/error.middleware';
import { generateAI }       from '../../shared/utils/ai-provider';
import { profileRepository } from '../profile/profile.repository';
import { recordsRepository } from '../records/records.repository';
import { plansRepository, type MealItemRow, type MealDayRow } from './plans.repository';

// ── Meal schedule mapping ─────────────────────────────────────────────────────

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast:       'Desayuno',
  morning_snack:   'Colación mañana',
  lunch:           'Almuerzo',
  afternoon_snack: 'Merienda',
  dinner:          'Cena',
  evening_snack:   'Colación noche',
};

const MEALS_BY_COUNT: Record<number, string[]> = {
  1: ['lunch'],
  2: ['breakfast', 'dinner'],
  3: ['breakfast', 'lunch', 'dinner'],
  4: ['breakfast', 'lunch', 'afternoon_snack', 'dinner'],
  5: ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner'],
  6: ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'evening_snack'],
};

const GOAL_LABELS: Record<string, string> = {
  fat_loss:    'pérdida de grasa',
  muscle_gain: 'ganancia muscular',
  recomp:      'recomposición corporal',
  maintain:    'mantenimiento',
};

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// ── AI response schema ────────────────────────────────────────────────────────

const mealOptionSchema = z.object({
  optionLabel: z.enum(['A', 'B']),
  name:        z.string().min(1),
  description: z.string().optional(),
  calories:    z.number().optional(),
  proteinG:    z.number().optional(),
  carbsG:      z.number().optional(),
  fatG:        z.number().optional(),
});

const mealSchema = z.object({
  mealType: z.enum([
    'breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'evening_snack',
  ]),
  options: z.array(mealOptionSchema).min(1).max(2),
});

const daySchema = z.object({
  dayNumber: z.number().int().min(1).max(7),
  dayName:   z.string().min(1),
  meals:     z.array(mealSchema).min(1),
});

const planResponseSchema = z.object({
  title: z.string().min(1),
  days:  z.array(daySchema).length(7),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMondayOfWeek(): Date {
  const today      = new Date();
  const dayOfWeek  = today.getDay(); // 0 = Sunday
  const daysToMon  = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday     = new Date(today);
  monday.setDate(today.getDate() + daysToMon);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced?.[1]) return fenced[1].trim();

  // Fallback: slice between first { and last }
  const start = raw.indexOf('{');
  const end   = raw.lastIndexOf('}');
  if (start !== -1 && end > start) return raw.slice(start, end + 1);

  return raw.trim();
}

function buildPlanPrompt(params: {
  name:         string;
  goalLabel:    string;
  tdee:         number;
  macrosLine:   string;
  weightKg:     number;
  restrictions: string;
  mealsPerDay:  number;
  mealTypes:    string[];
  weekStart:    string;
}): string {
  const mealList = params.mealTypes
    .map((t) => `${t} (${MEAL_TYPE_LABELS[t] ?? t})`)
    .join(', ');

  return `Sos un nutricionista clínico experto en planes alimentarios personalizados.

DATOS DEL PACIENTE:
- Nombre: ${params.name}
- Objetivo: ${params.goalLabel}
- TDEE: ${params.tdee} kcal/día
- Macros diarios objetivo: ${params.macrosLine}
- Peso actual: ${params.weightKg} kg
- Restricciones dietarias: ${params.restrictions}
- Comidas por día: ${params.mealsPerDay}

INSTRUCCIONES:
- Generá un plan para los 7 días de la semana (Lunes a Domingo)
- Cada día incluye exactamente estas ${params.mealsPerDay} comidas: ${mealList}
- Cada comida tiene exactamente 2 opciones (A y B) con preparaciones distintas
- Los valores nutricionales de cada día deben aproximarse al TDEE del paciente
- Describí porciones e ingredientes principales en el campo "description"
- Usá alimentos y porciones habituales en Argentina

RETORNÁ ÚNICAMENTE el siguiente JSON válido, sin texto adicional, sin markdown, sin explicaciones:
{
  "title": "Plan ${params.goalLabel} - semana del ${params.weekStart}",
  "days": [
    {
      "dayNumber": 1,
      "dayName": "Lunes",
      "meals": [
        {
          "mealType": "breakfast",
          "options": [
            { "optionLabel": "A", "name": "Nombre del plato", "description": "descripción con porciones e ingredientes", "calories": 400, "proteinG": 25.0, "carbsG": 40.0, "fatG": 15.0 },
            { "optionLabel": "B", "name": "Nombre del plato", "description": "descripción con porciones e ingredientes", "calories": 380, "proteinG": 22.0, "carbsG": 42.0, "fatG": 14.0 }
          ]
        }
      ]
    }
  ]
}

Completá los 7 días con exactamente ${params.mealTypes.length} comidas por día y 2 opciones (A y B) por comida.`;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const plansService = {
  async generateWeeklyPlan(userId: string) {
    const [profile, lastRecord] = await Promise.all([
      profileRepository.findByUserId(userId),
      recordsRepository.findLatestByUser(userId),
    ]);

    if (!profile) {
      throw new AppError(422, 'Necesitás completar tu perfil antes de generar un plan', 'PROFILE_REQUIRED');
    }
    if (!profile.tdeeCalculated || !profile.macrosJson) {
      throw new AppError(
        422,
        'Tu perfil necesita peso, altura, fecha de nacimiento, sexo y nivel de actividad para generar un plan',
        'PROFILE_INCOMPLETE',
      );
    }

    const macros     = profile.macrosJson as { calories?: number; proteinG?: number; carbsG?: number; fatG?: number };
    const mealsPerDay = Math.min(Math.max(profile.mealsPerDay, 1), 6);
    const mealTypes   = MEALS_BY_COUNT[mealsPerDay] ?? MEALS_BY_COUNT[3];
    const weekStart   = getMondayOfWeek();
    const currentWeight = lastRecord?.weightKg ?? profile.weightKg ?? 0;

    const prompt = buildPlanPrompt({
      name:         profile.name ?? 'paciente',
      goalLabel:    GOAL_LABELS[profile.goalType] ?? profile.goalType,
      tdee:         profile.tdeeCalculated,
      macrosLine:   `${macros.calories ?? '?'} kcal | Proteína: ${macros.proteinG ?? '?'}g | Carbos: ${macros.carbsG ?? '?'}g | Grasas: ${macros.fatG ?? '?'}g`,
      weightKg:     currentWeight,
      restrictions: profile.dietaryRestrictions.length > 0
        ? profile.dietaryRestrictions.join(', ')
        : 'ninguna',
      mealsPerDay,
      mealTypes,
      weekStart:    weekStart.toLocaleDateString('es-AR'),
    });

    // Generate and parse the AI response
    const raw     = await generateAI(prompt);
    const jsonStr = extractJson(raw);

    let aiPlan: z.infer<typeof planResponseSchema>;
    try {
      const parsed = planResponseSchema.safeParse(JSON.parse(jsonStr));
      if (!parsed.success) {
        throw new AppError(500, 'El plan generado tiene un formato inválido', 'PLAN_FORMAT_ERROR');
      }
      aiPlan = parsed.data;
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(500, 'No se pudo parsear el plan generado por la IA', 'PLAN_PARSE_ERROR');
    }

    // Flatten AI response into the repository's expected shape
    const days: MealDayRow[] = aiPlan.days.map((day, idx) => {
      const items: MealItemRow[] = day.meals.flatMap((meal) =>
        meal.options.map((opt) => ({
          mealType:    meal.mealType as MealType,
          optionLabel: opt.optionLabel,
          name:        opt.name,
          description: opt.description,
          calories:    opt.calories ? Math.round(opt.calories) : undefined,
          proteinG:    opt.proteinG,
          carbsG:      opt.carbsG,
          fatG:        opt.fatG,
        })),
      );
      return {
        dayNumber: day.dayNumber,
        dayName:   DAY_NAMES[idx] ?? day.dayName,
        items,
      };
    });

    const planId = await plansRepository.create({
      userId,
      title:     aiPlan.title,
      weekStart,
      days,
    });

    const fullPlan = await plansRepository.findById(planId);
    if (!fullPlan) throw new AppError(500, 'Error al recuperar el plan generado', 'PLAN_FETCH_ERROR');
    return fullPlan;
  },

  async list(userId: string) {
    return plansRepository.findByUser(userId, 10);
  },

  async get(userId: string, planId: string) {
    const plan = await plansRepository.findById(planId);
    if (!plan) throw new AppError(404, 'Plan no encontrado', 'PLAN_NOT_FOUND');
    if (plan.userId !== userId) throw new AppError(403, 'No tenés permiso para ver este plan', 'FORBIDDEN');
    return plan;
  },

  async remove(userId: string, planId: string) {
    const plan = await plansRepository.findById(planId);
    if (!plan) throw new AppError(404, 'Plan no encontrado', 'PLAN_NOT_FOUND');
    if (plan.userId !== userId) throw new AppError(403, 'No tenés permiso para eliminar este plan', 'FORBIDDEN');
    await plansRepository.deleteById(planId);
  },
};
