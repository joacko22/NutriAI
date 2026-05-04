# NutriAI — Contexto para nueva sesión (post Fase 3 Web)

## Resumen del proyecto

Plataforma de nutrición personalizada con AI. Portfolio + producto real.
Nutricionista virtual con contexto clínico profundo, planes alimentarios adaptativos y seguimiento de composición corporal.

**Working directory principal:** `C:\Users\Joaquin\Projects\nutriai\apps\web`
**Monorepo root:** `C:\Users\Joaquin\Projects\nutriai`

---

## Estado actual del proyecto

```
- [x] Fase 1 — Scaffold: estructura, docker, prisma schema, auth module
- [x] Fase 2 — Core: profile (Harris-Benedict), chat (SSE), records, plans
- [x] Fase 3 — Frontend: React + Vite web (puerto 5173)   ← RECIÉN COMPLETADA
- [ ] Fase 3 — Mobile: React Native + Expo
- [ ] Fase 4 — Deploy: Railway + Vercel
```

---

## Estructura del monorepo

```
nutriai/
├── apps/
│   ├── api/          → Backend Express (puerto 3001)
│   └── web/          → React + Vite (puerto 5173)   ← todo completado
├── packages/
│   └── shared/       → Tipos TypeScript compartidos
└── docs/
```

### Comandos
```bash
# Desde raíz
npm run dev:api       # API en puerto 3001
npm run dev:web       # Web en puerto 5173
docker-compose up -d  # PostgreSQL + Redis

# Desde apps/web
npm run dev
npx tsc --noEmit      # typecheck (actualmente 0 errores)
```

---

## Stack frontend (apps/web) — completado

| Herramienta | Versión | Rol |
|---|---|---|
| React | 19 | UI |
| Vite | 6 | Bundler |
| TypeScript | 5.6 (strict) | Tipos |
| TailwindCSS | 3.4 | Estilos |
| TanStack Query | v5.62 | Server state |
| React Router DOM | 6.28 | Routing |
| Zustand | 5.0 | Client state (auth) |
| class-variance-authority | 0.7 | Variantes de componentes |
| lucide-react | 0.460 | Iconos |
| sonner | latest | Toast notifications |
| recharts | latest | Gráfico de evolución de peso |

---

## Árbol de archivos `apps/web/src/`

```
src/
├── api/
│   ├── client.ts         → fetch wrapper con JWT, auto-refresh, ApiError
│   ├── auth.api.ts       → login, register, logout, refresh
│   ├── profile.api.ts    → get, upsert, patch, getMacros
│   ├── records.api.ts    → list, latest, create, update, remove
│   ├── chat.api.ts       → history, clearHistory, sendMessage (SSE)
│   └── plans.api.ts      → list, generate, get, remove
├── stores/
│   └── auth.store.ts     → Zustand persist (localStorage key: 'nutriai-auth')
├── lib/
│   └── utils.ts          → cn(), formatDate(), formatWeight()
├── components/
│   ├── ui/
│   │   ├── Button.tsx    → CVA variants: default/outline/ghost/destructive/link
│   │   ├── Input.tsx     → label + error prop
│   │   ├── Card.tsx      → Card, CardHeader, CardTitle, CardContent
│   │   ├── Badge.tsx
│   │   ├── Textarea.tsx
│   │   ├── Spinner.tsx
│   │   └── Skeleton.tsx  → Skeleton, DashboardSkeleton, RecordsListSkeleton, ChatHistorySkeleton, PlansSkeleton
│   ├── Layout.tsx        → Sidebar + <Outlet />
│   ├── Sidebar.tsx       → NavLink activo, logout, avatar inicial
│   └── ProtectedRoute.tsx → redirect a /login si sin accessToken
├── pages/
│   ├── LoginPage.tsx     → split panel, branding izquierda, form derecha
│   ├── RegisterPage.tsx  → form simple
│   ├── DashboardPage.tsx → metric cards, WeightChart (recharts), quick actions, recent records
│   ├── ProfilePage.tsx   → form completo + live TDEE preview client-side + skeleton loader
│   ├── ChatPage.tsx      → SSE streaming chat, optimistic messages, sugerencias, toast en errores
│   ├── RecordsPage.tsx   → add/edit inline, paginación, trend arrows, toasts en CRUD
│   └── PlansPage.tsx     → generate con toast.promise, lista, slide-in detail panel A/B
├── App.tsx               → createBrowserRouter, rutas anidadas
├── main.tsx              → QueryClient + ReactDOM.createRoot + Toaster (sonner)
└── index.css             → CSS variables design tokens, bg pattern, scrollbar
```

---

## Design system — "Clinical Dark Luxury"

### Tokens (CSS variables en `index.css`)
```css
--bg-base:     120 15% 7%     /* fondo principal — verde bosque muy oscuro */
--bg-surface:  120 12% 10%    /* cards, sidebar */
--bg-raised:   120 10% 13%    /* hover states, inputs */
--border:      120 8% 18%     /* bordes */
--accent:      138 35% 45%    /* verde salvia — color principal */
--accent-light:138 40% 58%
--accent-muted:138 20% 35%
--ink:         120 10% 88%    /* texto principal */
--ink-muted:   120 6% 58%
--ink-faint:   120 4% 38%
--danger:      0 65% 55%
--warn:        38 80% 55%
```

### Tipografía
- `font-serif` → DM Serif Display (títulos h1, logo)
- `font-sans` → Outfit (body, UI)
- `font-mono` → JetBrains Mono (datos numéricos: peso, kcal, macros)

### Animaciones
- `animate-fade-up` — entrada suave de elementos (0.3s ease-out)
- `animate-blink` — cursor SSE streaming
- `animate-shimmer` — skeleton loaders

---

## API Layer — patrones clave

### `api/client.ts`
- Base URL: `VITE_API_URL ?? 'http://localhost:3001'`
- Reads token from localStorage key `nutriai-auth` (Zustand persist format: `{ state: { accessToken, refreshToken } }`)
- Auto-refresh: on 401 calls `/api/v1/auth/refresh`, updates localStorage directly (evita circular dep con Zustand)
- Si refresh falla: limpia localStorage + redirige a `/login`
- `api.stream(path, body)` → retorna `Promise<Response>` raw para leer SSE manualmente

### SSE reading pattern (ChatPage)
```typescript
const response = await chatApi.sendMessage(content); // raw fetch Response
const reader = response.body!.getReader();
const decoder = new TextDecoder();
let buffer = '';
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const chunks = buffer.split('\n\n');
  buffer = chunks.pop() ?? '';
  for (const chunk of chunks) {
    for (const line of chunk.split('\n')) {
      if (line.startsWith('data: ')) {
        const text = line.slice(6);
        if (text !== '[DONE]') setStreamContent(prev => prev + text);
      }
    }
  }
}
```

### TanStack Query v5 — queryKeys utilizadas
```typescript
['profile']
['records', page, limit]
['records', 'latest']
['chat', 'history']
['plans']
['plans', id]
```

---

## Auth store (`stores/auth.store.ts`)

```typescript
useAuthStore → { accessToken, refreshToken, user, login(AuthResponse), logout() }
// Persistido en localStorage como: { state: { accessToken, refreshToken, user }, version: 0 }
```

---

## Router (`App.tsx`)

```
/login     → LoginPage     (público)
/register  → RegisterPage  (público)
/          → ProtectedRoute (redirect a /login si sin token)
  └── Layout (Sidebar + Outlet)
        ├── /           → DashboardPage
        ├── /profile    → ProfilePage
        ├── /chat       → ChatPage
        ├── /records    → RecordsPage
        └── /plans      → PlansPage
*          → redirect a /
```

---

## Backend — API endpoints disponibles (puerto 3001)

### Auth
```
POST /api/v1/auth/register   → { accessToken, refreshToken, user }
POST /api/v1/auth/login      → { accessToken, refreshToken, user }
POST /api/v1/auth/refresh    → { accessToken, refreshToken }
POST /api/v1/auth/logout
```

### Profile
```
GET   /api/v1/profile
PUT   /api/v1/profile        → upsert completo (recalcula TDEE/macros)
PATCH /api/v1/profile        → actualización parcial
GET   /api/v1/profile/macros → { bmr, tdee, macros }
```

### Records
```
GET    /api/v1/records?page=1&limit=20
POST   /api/v1/records
PATCH  /api/v1/records/:id
DELETE /api/v1/records/:id
GET    /api/v1/records/latest
```

### Chat
```
GET    /api/v1/chat/history
POST   /api/v1/chat/message  → SSE stream (text/event-stream), rate limit 20/min
DELETE /api/v1/chat/history
```

### Plans
```
GET    /api/v1/plans
POST   /api/v1/plans/generate → genera con AI, rate limit 5/hora
GET    /api/v1/plans/:id
DELETE /api/v1/plans/:id
```

---

## Tipos compartidos (`packages/shared/src/index.ts`)

```typescript
// Accedidos vía alias de Vite: '@nutriai/shared'
type GoalType      = 'fat_loss' | 'muscle_gain' | 'recomp' | 'maintain'
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
type Sex           = 'male' | 'female'
type MealType      = 'breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner' | 'evening_snack'
type MessageRole   = 'user' | 'assistant'

interface ProfileData { name?, birthDate?, sex?, heightCm?, weightKg?, goalWeightKg?,
                        goalType?, activityLevel?, mealsPerDay?,
                        dietaryRestrictions?, mealSchedule?, observations? }
interface BodyRecordData { weightKg, bodyFatPct?, waistCm?, neckCm?, notes? }
interface ChatMessage { id, role, content, createdAt }
interface MacroTarget { calories, proteinG, carbsG, fatG }
interface AuthResponse { accessToken, refreshToken, user: { id, email, role } }
```

---

## Fórmula nutricional (Harris-Benedict — implementada en backend y client-side preview)

```
Hombres: BMR = 88.362 + (13.397 × kg) + (4.799 × cm) - (5.677 × edad)
Mujeres: BMR = 447.593 + (9.247 × kg) + (3.098 × cm) - (4.330 × edad)
TDEE = BMR × factor_actividad
  sedentary: 1.2 | light: 1.375 | moderate: 1.55 | active: 1.725 | very_active: 1.9
```

---

## Mejoras UX implementadas (post Fase 3)

### Toast notifications — `sonner`
- `<Toaster>` montado en `main.tsx` con tema dark y colores del design system (bg-surface, Outfit font)
- **ProfilePage**: `toast.success` al guardar, `toast.error` en fallo
- **RecordsPage**: success/error en crear, actualizar y eliminar registros
- **PlansPage**: `toast.promise(mutateAsync())` para generación AI (loading → success/error automático); success/error al eliminar
- **ChatPage**: `toast.error` en fallo de stream SSE; `toast.success` al borrar historial
- Se eliminaron los banners de error inline en PlansPage y el texto de error en ProfilePage (reemplazados por toasts)

### Gráfico de evolución de peso — `recharts`
- Componente `WeightChart` en `DashboardPage` con `LineChart` responsive
- Query adicional `['records', 1, 30]` para tener datos suficientes
- Línea verde salvia (`--accent`), grid mínimo, tooltip con fuente mono del design system
- El card solo aparece cuando hay ≥ 2 registros

### Skeleton loaders
- `src/components/ui/Skeleton.tsx` — building block `Skeleton` con `animate-shimmer` + variantes compuestas:
  - `DashboardSkeleton` — 4 metric cards + grid quick actions + historial rows
  - `RecordsListSkeleton` — rows con forma de peso + fecha + botones de acción
  - `ChatHistorySkeleton` — 5 burbujas alternadas user/assistant
  - `PlansSkeleton` — 4 plan cards con icono + textos
- Reemplazan todos los `<Spinner>` de loading en Dashboard, Records, Chat y Plans

### Proxy Vite y CORS — resueltos
- `vite.config.ts` tiene proxy `/api → http://localhost:3001` configurado
- Backend: `CLIENT_URL=http://localhost:5173` en `.env`, CORS correcto en `app.ts`

---

## Pendiente (próximas sesiones)

### Inmediato — testing
- Testear flujo completo end-to-end: register → profile → chat → records → plans

### Fase 3 Mobile
- React Native + Expo
- Mismas API calls, mismo design system adaptado a móvil

### Fase 4 — Deploy
- Backend: Railway (con PostgreSQL y Redis)
- Frontend: Vercel
- Variables de entorno de producción
- CORS configurado para dominio de producción

### Mejoras UX opcionales restantes
- Modo claro (ya tiene las CSS variables estructuradas para soportarlo)
- Edición inline de mensajes en el chat

---

## Posibles problemas al levantar

1. **CORS**: `CLIENT_URL=http://localhost:5173` en `apps/api/.env` — ya configurado.
2. **Proxy Vite**: configurado en `vite.config.ts` — `/api → http://localhost:3001`.
3. **Docker**: asegurarse de que PostgreSQL y Redis estén corriendo con `docker-compose up -d` desde la raíz.
4. **JWT keys**: `apps/api/.env` necesita `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` seteados.
