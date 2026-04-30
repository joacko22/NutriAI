import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';

export interface RecordFilters {
  page:  number;
  limit: number;
  from?: Date;
  to?:   Date;
}

type CreateRecordData = Prisma.BodyRecordUncheckedCreateInput;

type UpdateRecordData = {
  weightKg?:   number;
  bodyFatPct?: number | null;
  waistCm?:    number | null;
  neckCm?:     number | null;
  notes?:      string | null;
  recordedAt?: Date;
};

export const recordsRepository = {
  async findByUser(userId: string, { page, limit, from, to }: RecordFilters) {
    const where: Prisma.BodyRecordWhereInput = {
      userId,
      ...(from || to
        ? { recordedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
    };

    const [data, total] = await prisma.$transaction([
      prisma.bodyRecord.findMany({
        where,
        orderBy: { recordedAt: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
      prisma.bodyRecord.count({ where }),
    ]);

    return { data, total };
  },

  findById(id: string) {
    return prisma.bodyRecord.findUnique({ where: { id } });
  },

  findLatestByUser(userId: string) {
    return prisma.bodyRecord.findFirst({
      where:   { userId },
      orderBy: { recordedAt: 'desc' },
    });
  },

  create(data: CreateRecordData) {
    return prisma.bodyRecord.create({ data });
  },

  update(id: string, data: UpdateRecordData) {
    return prisma.bodyRecord.update({ where: { id }, data });
  },

  deleteById(id: string) {
    return prisma.bodyRecord.delete({ where: { id } });
  },
};
