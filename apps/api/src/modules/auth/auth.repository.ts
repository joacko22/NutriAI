import { prisma } from '../../config/prisma';

export const authRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findByGoogleId(googleId: string) {
    return prisma.user.findUnique({ where: { googleId } });
  },

  findById(id: string) {
    return prisma.user.findUnique({
      where:  { id },
      select: { id: true, email: true, role: true },
    });
  },

  create(data: { email: string; passwordHash?: string; googleId?: string }) {
    return prisma.user.create({ data });
  },

  updateGoogleId(id: string, googleId: string) {
    return prisma.user.update({
      where: { id },
      data:  { googleId, lastLoginAt: new Date() },
    });
  },

  updateLastLogin(id: string) {
    return prisma.user.update({
      where: { id },
      data:  { lastLoginAt: new Date() },
    });
  },

  saveRefreshToken(userId: string, token: string, expiresAt: Date) {
    return prisma.refreshToken.create({
      data: { userId, token, expiresAt },
    });
  },

  findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({ where: { token } });
  },

  deleteRefreshToken(token: string) {
    return prisma.refreshToken.deleteMany({ where: { token } });
  },

  deleteAllRefreshTokens(userId: string) {
    return prisma.refreshToken.deleteMany({ where: { userId } });
  },
};
