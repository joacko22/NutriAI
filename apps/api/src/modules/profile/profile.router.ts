import { Router } from 'express';
import { z }      from 'zod';
import { authenticate }  from '../../shared/middleware/auth.middleware';
import { profileService } from './profile.service';

export const profileRouter = Router();

const profileBodySchema = z.object({
  name:                 z.string().min(1).max(100).optional(),
  birthDate:            z.coerce.date().optional(),
  sex:                  z.enum(['male', 'female']).optional(),
  heightCm:             z.number().positive().max(300).optional(),
  weightKg:             z.number().positive().max(500).optional(),
  goalWeightKg:         z.number().positive().max(500).optional(),
  goalType:             z.enum(['fat_loss', 'muscle_gain', 'recomp', 'maintain']).optional(),
  activityLevel:        z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional(),
  mealsPerDay:          z.number().int().min(1).max(10).optional(),
  dietaryRestrictions:  z.array(z.string()).optional(),
  mealSchedule:         z.string().max(500).optional(),
  observations:         z.string().max(1000).optional(),
});

// GET /api/v1/profile
profileRouter.get('/', authenticate, async (req, res) => {
  const profile = await profileService.get(req.user!.id);
  res.json(profile);
});

// GET /api/v1/profile/macros
profileRouter.get('/macros', authenticate, async (req, res) => {
  const macros = await profileService.getMacros(req.user!.id);
  res.json(macros);
});

// PUT /api/v1/profile
profileRouter.put('/', authenticate, async (req, res) => {
  const input   = profileBodySchema.parse(req.body);
  const profile = await profileService.upsert(req.user!.id, input);
  res.json(profile);
});

// PATCH /api/v1/profile
profileRouter.patch('/', authenticate, async (req, res) => {
  const input   = profileBodySchema.parse(req.body);
  const profile = await profileService.patch(req.user!.id, input);
  res.json(profile);
});
