import bcrypt from 'bcryptjs';
import { authRepository } from './auth.repository';
import { AppError } from '../../shared/middleware/error.middleware';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../shared/utils/jwt';

export const authService = {

  async register(email: string, password: string) {
    const existing = await authRepository.findByEmail(email);
    if (existing) throw new AppError(409, 'El email ya está registrado', 'EMAIL_TAKEN');

    const passwordHash = await bcrypt.hash(password, 12);
    const user         = await authRepository.create({ email, passwordHash });

    return this._issueTokens({ id: user.id, email: user.email, role: user.role });
  },

  async login(email: string, password: string) {
    const user = await authRepository.findByEmail(email);
    if (!user?.passwordHash) {
      throw new AppError(401, 'Credenciales inválidas', 'INVALID_CREDENTIALS');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError(401, 'Credenciales inválidas', 'INVALID_CREDENTIALS');

    await authRepository.updateLastLogin(user.id);
    return this._issueTokens({ id: user.id, email: user.email, role: user.role });
  },

  async refresh(token: string) {
    let payload: { sub: string };
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new AppError(401, 'Refresh token inválido', 'INVALID_REFRESH_TOKEN');
    }

    const stored = await authRepository.findRefreshToken(token);
    if (!stored || stored.expiresAt < new Date()) {
      throw new AppError(401, 'Refresh token expirado o revocado', 'REFRESH_TOKEN_EXPIRED');
    }

    const user = await authRepository.findById(payload.sub);
    if (!user) throw new AppError(404, 'Usuario no encontrado', 'USER_NOT_FOUND');

    // Rotate: eliminar el viejo, crear uno nuevo
    await authRepository.deleteRefreshToken(token);
    return this._issueTokens(user);
  },

  async logout(refreshToken: string) {
    await authRepository.deleteRefreshToken(refreshToken);
  },

  async findOrCreateGoogleUser(googleProfile: {
    id:          string;
    email:       string;
    displayName: string;
  }) {
    // 1. Buscar por googleId
    let user = await authRepository.findByGoogleId(googleProfile.id);

    let isNewUser = false;

    if (!user) {
      // 2. Buscar por email (vincular cuenta existente)
      const byEmail = await authRepository.findByEmail(googleProfile.email);
      if (byEmail) {
        await authRepository.updateGoogleId(byEmail.id, googleProfile.id);
        user = { ...byEmail, googleId: googleProfile.id };
      } else {
        // 3. Crear usuario nuevo
        user = await authRepository.create({
          email:    googleProfile.email,
          googleId: googleProfile.id,
        });
        isNewUser = true;
      }
    }

    return { ...(await this._issueTokens({ id: user.id, email: user.email, role: user.role })), isNewUser };
  },

  async _issueTokens(user: { id: string; email: string; role: string }) {
    const accessToken  = signAccessToken({ sub: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken(user.id);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await authRepository.saveRefreshToken(user.id, refreshToken, expiresAt);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role },
    };
  },
};
