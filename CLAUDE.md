# NutriAI — Claude Code Context

## Proyecto
Plataforma de nutrición personalizada con AI. Portfolio + producto real.
Nutricionista virtual con contexto clínico profundo, planes alimentarios adaptativos y seguimiento de composición corporal.

## Estructura del monorepo
```
nutriai/
├── apps/
│   ├── api/          → Backend Express (puerto 3001)
│   ├── web/          → React + Vite (puerto 5173)  [Fase 3]
│   └── mobile/       → React Native + Expo          [Fase 3]
├── packages/
│   └── shared/       → Tipos TypeScript, schemas Zod, utils compartidos
└── docs/             → ADR, PRD y documentación técnica
```

## Stack tecnológico
- **Backend**: Node.js 20 + Express + TypeScript (strict)
- **ORM**: Prisma + PostgreSQL 16
- **Cache/Rate limit**: Redis (Upstash en prod, local en dev)
- **Auth**: JWT RS256 + Google OAuth 2.0 (Passport.js)
- **AI**: Gemini 2.0 Flash (primario) + Groq Llama 3.3 70B (fallback)
- **Streaming**: SSE (Server-Sent Events)
- **Validación**: Zod en todos los request bodies
- **Logging**: pino + pino-http

## Reglas de arquitectura — NUNCA violar

### Estructura de módulos backend
```
modules/
  {nombre}/
    {nombre}.router.ts      → Rutas Express + validación Zod
    {nombre}.service.ts     → Lógica de negocio
    {nombre}.repository.ts  → Queries Prisma (única capa que toca prisma)
```
- **Nunca** lógica de negocio en routers
- **Nunca** queries Prisma directas fuera del repository
- **Nunca** instanciar Gemini/Groq fuera de `ai-provider.ts`

### Manejo de errores
- Siempre usar `AppError(statusCode, message, code)` de `shared/middleware/error.middleware.ts`
- Nunca `throw new Error(...)` genérico
- Todos los handlers son async — express-async-errors está instalado

### Validación
- Zod parse en el router, antes de llegar al service
- Usar `.parse()` (no `.safeParse()`) salvo que se maneje el error explícitamente

### AI Provider
- Siempre usar `streamAI()` de `shared/utils/ai-provider.ts`
- System prompt siempre construido con `buildNutriSystemPrompt(profile)` de `shared/utils/system-prompt.ts`

### Seguridad
- Todos los endpoints privados usan middleware `authenticate` de `shared/middleware/auth.middleware.ts`
- **Nunca** loguear passwords, tokens ni datos sensibles (PII)
- Rate limiting en endpoints de AI

### Naming conventions
- Archivos: `kebab-case.tipo.ts` → `auth.service.ts`
- Interfaces/Types/Clases: `PascalCase`
- Variables/funciones: `camelCase`
- Constantes globales: `UPPER_SNAKE_CASE`
- Enums Prisma: `PascalCase`

### Base de datos
- Schema: `apps/api/prisma/schema.prisma`
- Migrations: `npx prisma migrate dev --name descripcion-corta`
- **Nunca** modificar tablas directamente — siempre via migrations
- IDs: UUID v4 → `@default(uuid())`
- Timestamps: `createdAt @default(now())`, `updatedAt @updatedAt`

## Comandos frecuentes
```bash
# Infra (desde raíz)
docker-compose up -d                          # Levantar PostgreSQL + Redis
docker-compose down                           # Bajar servicios

# API (desde apps/api)
npm run dev                                   # Dev server con hot reload
npx prisma migrate dev --name <nombre>        # Nueva migración
npx prisma generate                           # Regenerar cliente TypeScript
npx prisma studio                             # GUI visual de la BD
npx prisma migrate reset                      # Reset completo (solo dev)

# Generar secretos JWT
node -e "const c=require('crypto');console.log(c.randomBytes(64).toString('hex'))"
```

## Variables de entorno
Ver `apps/api/.env.example`. **Nunca** commitear `.env`.

## Estado del proyecto
- [x] Fase 1 — Scaffold: estructura, docker, prisma schema, auth module
- [x] Fase 2 — Core: profile (Harris-Benedict), chat (SSE), records, plans
- [ ] Fase 3 — Frontend: React + Vite web
- [ ] Fase 3 — Mobile: React Native + Expo
- [ ] Fase 4 — Deploy: Railway + Vercel

## Fórmula nutricional
Harris-Benedict revisada (Roza & Shizgal 1984) implementada en `shared/utils/harris-benedict.ts`
- Hombres: `88.362 + (13.397 × peso) + (4.799 × altura) - (5.677 × edad)`
- Mujeres: `447.593 + (9.247 × peso) + (3.098 × altura) - (4.330 × edad)`
- TDEE = BMR × factor de actividad (1.2 a 1.9)

## Decisiones de arquitectura
Documentadas en `docs/` — ver ADR para justificación de cada elección tecnológica.

## Módulos implementados
### Auth (`/api/v1/auth`)
- POST `/register` — email + password
- POST `/login` — retorna accessToken + refreshToken
- POST `/refresh` — rota el refresh token
- POST `/logout` — invalida el refresh token

### Profile (`/api/v1/profile`)
- GET `/profile` — retorna perfil del usuario
- PUT `/profile` — crea o reemplaza perfil completo (recalcula TDEE/macros)
- PATCH `/profile` — actualización parcial (recalcula TDEE/macros)
- GET `/profile/macros` — retorna BMR, TDEE y macros calculados

### Records (`/api/v1/records`)
- GET `/records` — lista paginada con filtro de fechas (?page, ?limit, ?from, ?to)
- POST `/records` — crear registro (sincroniza weightKg al profile)
- PATCH `/records/:id` — editar (solo el dueño)
- DELETE `/records/:id` — eliminar (solo el dueño)
- GET `/records/latest` — último registro del usuario

### Chat (`/api/v1/chat`)
- GET `/chat/history` — últimos 60 mensajes cronológicos
- POST `/chat/message` — SSE streaming (20 req/min por usuario)
- DELETE `/chat/history` — limpia el historial

### Plans (`/api/v1/plans`)
- GET `/plans` — lista de planes (últimos 10)
- POST `/plans/generate` — genera plan semanal con AI (5 req/hora por usuario)
- GET `/plans/:id` — plan completo con días y comidas
- DELETE `/plans/:id` — eliminar plan (solo el dueño)

### Shared middleware
- `rate-limit.middleware.ts` — Redis INCR/EXPIRE, fail-open si Redis no disponible
- `ai-provider.ts` — `generateAI()` non-streaming + `streamAI()` streaming, ambos con fallback Gemini → Groq
