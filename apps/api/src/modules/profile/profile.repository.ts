import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';

// ProfileUncheckedCreateInput uses plain scalar types (no Prisma operation wrappers),
// which works for both sides of upsert and is structurally assignable to the update input.
type ProfileData = Omit<Prisma.ProfileUncheckedCreateInput, 'userId'>;

export const profileRepository = {
  findByUserId(userId: string) {
    return prisma.profile.findUnique({ where: { userId } });
  },

  upsert(userId: string, data: ProfileData) {
    return prisma.profile.upsert({
      where:  { userId },
      update: data,
      create: { userId, ...data },
    });
  },
};
