import { Router } from 'express';
import { z }      from 'zod';
import { authenticate }  from '../../shared/middleware/auth.middleware';
import { recordsService } from './records.service';

export const recordsRouter = Router();

const createSchema = z.object({
  weightKg:   z.number().positive().max(500),
  bodyFatPct: z.number().min(0).max(100).optional(),
  waistCm:    z.number().positive().max(300).optional(),
  neckCm:     z.number().positive().max(200).optional(),
  notes:      z.string().max(500).optional(),
  recordedAt: z.coerce.date().optional(),
});

const patchSchema = z.object({
  weightKg:   z.number().positive().max(500).optional(),
  bodyFatPct: z.number().min(0).max(100).nullable().optional(),
  waistCm:    z.number().positive().max(300).nullable().optional(),
  neckCm:     z.number().positive().max(200).nullable().optional(),
  notes:      z.string().max(500).nullable().optional(),
  recordedAt: z.coerce.date().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'Al menos un campo es requerido' });

const listQuerySchema = z.object({
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  from:  z.coerce.date().optional(),
  to:    z.coerce.date().optional(),
});

// GET /api/v1/records/latest  — debe ir antes de /:id para evitar captura por Express
recordsRouter.get('/latest', authenticate, async (req, res) => {
  const record = await recordsService.latest(req.user!.id);
  res.json(record);
});

// GET /api/v1/records
recordsRouter.get('/', authenticate, async (req, res) => {
  const filters = listQuerySchema.parse(req.query);
  const result  = await recordsService.list(req.user!.id, filters);
  res.json(result);
});

// POST /api/v1/records
recordsRouter.post('/', authenticate, async (req, res) => {
  const input  = createSchema.parse(req.body);
  const record = await recordsService.create(req.user!.id, input);
  res.status(201).json(record);
});

// PATCH /api/v1/records/:id
recordsRouter.patch('/:id', authenticate, async (req, res) => {
  const input  = patchSchema.parse(req.body);
  const record = await recordsService.patch(req.user!.id, req.params['id'] as string, input);
  res.json(record);
});

// DELETE /api/v1/records/:id
recordsRouter.delete('/:id', authenticate, async (req, res) => {
  await recordsService.remove(req.user!.id, req.params['id'] as string);
  res.status(204).send();
});
