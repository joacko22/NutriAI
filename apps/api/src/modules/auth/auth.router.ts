import { Router } from 'express';
import { z }      from 'zod';
import { authService } from './auth.service';
import { AppError }    from '../../shared/middleware/error.middleware';

export const authRouter = Router();

const registerSchema = z.object({
  email:    z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener mínimo 6 caracteres'),
});

const loginSchema = z.object({
  email:    z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

// POST /api/v1/auth/register
authRouter.post('/register', async (req, res) => {
  const { email, password } = registerSchema.parse(req.body);
  const result = await authService.register(email, password);
  res.status(201).json(result);
});

// POST /api/v1/auth/login
authRouter.post('/login', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const result = await authService.login(email, password);
  res.json(result);
});

// POST /api/v1/auth/refresh
authRouter.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new AppError(400, 'refreshToken requerido', 'MISSING_TOKEN');
  const result = await authService.refresh(refreshToken);
  res.json(result);
});

// POST /api/v1/auth/logout
authRouter.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) await authService.logout(refreshToken);
  res.json({ message: 'Sesión cerrada correctamente' });
});
