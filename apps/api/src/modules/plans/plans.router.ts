import { Router } from 'express';
import { authenticate }    from '../../shared/middleware/auth.middleware';
import { createRateLimit }  from '../../shared/middleware/rate-limit.middleware';
import { plansService }    from './plans.service';

// 5 plan generations per hour per user (expensive AI operation)
const generateRateLimit = createRateLimit({ windowSecs: 3600, maxRequests: 5, keyPrefix: 'plans' });

export const plansRouter = Router();

// GET /api/v1/plans
plansRouter.get('/', authenticate, async (req, res) => {
  const plans = await plansService.list(req.user!.id);
  res.json(plans);
});

// POST /api/v1/plans/generate — registered before /:id to avoid param capture
plansRouter.post('/generate', authenticate, generateRateLimit, async (req, res) => {
  const plan = await plansService.generateWeeklyPlan(req.user!.id);
  res.status(201).json(plan);
});

// GET /api/v1/plans/:id
plansRouter.get('/:id', authenticate, async (req, res) => {
  const plan = await plansService.get(req.user!.id, req.params['id'] as string);
  res.json(plan);
});

// DELETE /api/v1/plans/:id
plansRouter.delete('/:id', authenticate, async (req, res) => {
  await plansService.remove(req.user!.id, req.params['id'] as string);
  res.status(204).send();
});
