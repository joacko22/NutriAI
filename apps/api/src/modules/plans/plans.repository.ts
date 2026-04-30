import { MealType } from '@prisma/client';
import { prisma }   from '../../config/prisma';

export interface MealItemRow {
  mealType:     MealType;
  optionLabel:  string;
  name:         string;
  description?: string;
  calories?:    number;
  proteinG?:    number;
  carbsG?:      number;
  fatG?:        number;
}

export interface MealDayRow {
  dayNumber: number;
  dayName:   string;
  items:     MealItemRow[];
}

export interface CreatePlanData {
  userId:    string;
  title:     string;
  weekStart: Date;
  days:      MealDayRow[];
}

export const plansRepository = {
  findByUser(userId: string, limit: number) {
    return prisma.mealPlan.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      take:    limit,
    });
  },

  findById(id: string) {
    return prisma.mealPlan.findUnique({
      where:   { id },
      include: {
        days: {
          orderBy: { dayNumber: 'asc' },
          include: {
            items: { orderBy: [{ mealType: 'asc' }, { optionLabel: 'asc' }] },
          },
        },
      },
    });
  },

  async create(data: CreatePlanData): Promise<string> {
    return prisma.$transaction(async (tx) => {
      const plan = await tx.mealPlan.create({
        data: { userId: data.userId, title: data.title, weekStart: data.weekStart },
      });

      for (const day of data.days) {
        const mealDay = await tx.mealDay.create({
          data: { mealPlanId: plan.id, dayNumber: day.dayNumber, dayName: day.dayName },
        });

        if (day.items.length > 0) {
          await tx.mealItem.createMany({
            data: day.items.map((item) => ({ mealDayId: mealDay.id, ...item })),
          });
        }
      }

      return plan.id;
    });
  },

  deleteById(id: string) {
    return prisma.mealPlan.delete({ where: { id } });
  },
};
