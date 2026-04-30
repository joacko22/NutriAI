# Fase 2 — Implementación del Core (Backend)

Fecha: 2026-04-30  
Estado: ✅ Completa

---

## Resumen

Implementación completa de los cuatro módulos de negocio del backend NutriAI: profile, records, chat y plans. Cada módulo sigue la arquitectura de tres capas definida en la Fase 1: `router → service → repository`.

---

## Archivos creados / modificados

### Nuevos
```
apps/api/src/
  modules/
    profile/
      profile.repository.ts
      profile.service.ts
      profile.router.ts          ← reemplazó el placeholder
    records/
      records.repository.ts
      records.service.ts
      records.router.ts          ← reemplazó el placeholder
    chat/
      chat.repository.ts
      chat.service.ts
      chat.router.ts             ← reemplazó el placeholder
    plans/
      plans.repository.ts
      plans.service.ts
      plans.router.ts            ← reemplazó el placeholder
  shared/
    middleware/
      rate-limit.middleware.ts   ← nuevo

apps/api/.env.example            ← nuevo
docs/fase-2-implementacion.md    ← este archivo
```

### Modificados
```
apps/api/src/shared/utils/ai-provider.ts   ← agregado generateAI()
apps/api/src/index.ts                      ← startup log actualizado
CLAUDE.md                                  ← Fase 2 marcada completa
```

---

## Módulo Profile (`/api/v1/profile`)

### Endpoints

| Método | Ruta             | Descripción                                   |
|--------|------------------|-----------------------------------------------|
| GET    | `/profile`       | Retorna el perfil completo del usuario        |
| PUT    | `/profile`       | Crea o reemplaza el perfil completo           |
| PATCH  | `/profile`       | Actualización parcial (merge con existente)   |
| GET    | `/profile/macros`| Retorna BMR, TDEE y macros calculados         |

### Comportamiento clave

**Cálculo automático de métricas** — Tanto `PUT` como `PATCH` calculan BMR, TDEE y distribución de macros con Harris-Benedict (Roza & Shizgal, 1984) al guardar. El cálculo requiere `weightKg`, `heightCm`, `birthDate`, `sex` y `activityLevel`. Si falta alguno, las métricas se omiten silenciosamente (la upsert no las toca).

**PATCH semántico** — `patch()` en el service carga el perfil existente, mergea el input encima, y recalcula las métricas con el conjunto combinado. Esto garantiza que un PATCH parcial (ej: solo actualizar `activityLevel`) recalcule el TDEE con todos los datos ya guardados.

**`GET /profile/macros`** — Retorna `422 METRICS_UNAVAILABLE` si el perfil existe pero no tiene datos suficientes para calcular, en lugar de retornar nulls silenciosamente.

### Decisiones de tipos (TypeScript)

`Prisma.ProfileUncheckedCreateInput` (sin `userId`) se usa como tipo del dato en el repositorio en lugar de `ProfileUncheckedUpdateInput`, porque el update input de Prisma incluye tipos de operaciones atómicas (`StringFieldUpdateOperationsInput`) que no son asignables al lado `create` de un `upsert`. El create input usa solo escalares planos y es estructuralmente asignable al update input.

`macrosJson` se castea a `Prisma.InputJsonValue` porque `MacroTarget` es un objeto sin index signature y Prisma requiere `[key: string]: InputJsonValue` para campos JSON. El cast `as unknown as Prisma.InputJsonValue` es seguro en runtime: `MacroTarget` siempre serializa como un JSON object válido.

---

## Módulo Records (`/api/v1/records`)

### Endpoints

| Método | Ruta               | Descripción                                    |
|--------|--------------------|------------------------------------------------|
| GET    | `/records`         | Lista paginada con filtro de fechas opcional   |
| POST   | `/records`         | Crea registro (weightKg requerido)             |
| PATCH  | `/records/:id`     | Edita (solo el dueño)                          |
| DELETE | `/records/:id`     | Elimina (solo el dueño)                        |
| GET    | `/records/latest`  | Último registro del usuario                    |

### Comportamiento clave

**Sincronización de peso** — Al crear un record, se llama `profileService.patch(userId, { weightKg })` para actualizar el campo `weightKg` del perfil y recalcular TDEE/macros con el nuevo peso. La llamada usa `.catch(() => {})` (fail-open): si no hay perfil o Redis/DB falla, el record se guarda igual.

**Paginación** — `findByUser` usa `prisma.$transaction([findMany, count])` para obtener datos y total en una sola roundtrip. Retorna `{ data, meta: { total, page, limit, totalPages } }`.

**Filtro de fechas** — Parámetros `?from=` y `?to=` aceptan cualquier formato que `z.coerce.date()` entienda (ISO 8601, timestamps, etc.).

**Ruta ordering** — `GET /latest` se registra antes que `PATCH /:id` y `DELETE /:id` como precaución, aunque no hay `GET /:id` que pudiera capturar "latest" como parámetro.

**PATCH con nullable** — El schema Zod para patch permite `null` en campos opcionales (`bodyFatPct`, `waistCm`, `neckCm`, `notes`), lo que permite borrar valores previamente guardados.

### Decisiones de diseño

**Ownership check en service, no en repository** — Cada método de mutación (`patch`, `remove`) hace `findById` primero y verifica `record.userId !== userId` antes de operar. El repository no sabe nada de autorización.

---

## Módulo Chat (`/api/v1/chat`)

### Endpoints

| Método | Ruta              | Descripción                              |
|--------|-------------------|------------------------------------------|
| GET    | `/chat/history`   | Últimos 60 mensajes cronológicos         |
| POST   | `/chat/message`   | SSE streaming (rate limit: 20/min)       |
| DELETE | `/chat/history`   | Limpia el historial del usuario          |

### Flujo de `POST /message`

```
1. Zod valida { content: string (1-4000) }
2. Rate limit check (Redis INCR/EXPIRE)
3. Se setean headers SSE antes del try-catch
4. chatService.sendMessage(userId, content):
   a. Promise.all([profileRepository, recordsRepository]) — carga contexto en paralelo
   b. buildNutriSystemPrompt(profile + lastRecord) — system prompt dinámico
   c. findOrCreateConversation(userId) — una conversación activa por usuario
   d. getMessages(conversationId, 40) + reverse() — últimos 40 mensajes cronológicos
   e. streamAI([...history, userMessage], systemPrompt) — Gemini 2.0 Flash / Groq fallback
   f. Retorna { stream, saveResponse }
5. Readable.fromWeb(stream) — convierte Web ReadableStream → Node.js Readable
6. nodeStream.on('data') → res.write(chunk) + acumula fullText parseando SSE frames
7. nodeStream.on('end') → saveResponse(fullText) → persiste user+assistant messages
8. req.on('close') → nodeStream.destroy() — limpia si el cliente desconecta
```

### Decisiones de diseño

**Guardado al final, no al inicio** — Los mensajes (user + assistant) se guardan DESPUÉS de que el stream termina exitosamente. Esto evita mensajes de usuario huérfanos si `streamAI` falla antes de producir output. Contrapartida: si el cliente desconecta a mitad del stream, el intercambio no se guarda.

**Una conversación activa por usuario** — `findOrCreateConversation` usa `findFirst orderBy updatedAt desc`. No se implementa multi-conversación en Fase 2.

**Contexto AI** — `profile` y `lastRecord` se cargan en paralelo. El profile se pasa directamente a `buildNutriSystemPrompt` con spread: los tipos Prisma (enums como `Sex`, `GoalType`) son subtipos de `string` y son estructuralmente compatibles con `ProfileContext`. Los campos extra del modelo Prisma (`userId`, `birthDate`, `updatedAt`) son ignorados por TypeScript al asignar a la interfaz.

**`res.writableEnded` guards** — Los handlers `end` y `error` del nodeStream verifican `res.writableEnded` antes de escribir, evitando escrituras en una respuesta ya cerrada (ej: cliente desconecta durante el stream).

**SSE frame parsing** — El acumulador de texto parsea línea a línea buscando `data: {json}` y saltea `[DONE]`. Esto es robusto contra chunks que lleguen con múltiples frames SSE.

---

## Módulo Plans (`/api/v1/plans`)

### Endpoints

| Método | Ruta               | Descripción                                      |
|--------|--------------------|--------------------------------------------------|
| GET    | `/plans`           | Lista los últimos 10 planes del usuario          |
| POST   | `/plans/generate`  | Genera plan semanal con AI (rate limit: 5/hora)  |
| GET    | `/plans/:id`       | Plan completo con días y comidas                 |
| DELETE | `/plans/:id`       | Elimina plan (solo el dueño)                     |

### Flujo de `POST /plans/generate`

```
1. Rate limit check (5 req/hora por usuario)
2. Promise.all([profileRepository, recordsRepository]) — contexto en paralelo
3. Validación temprana: 422 si no hay perfil o si faltan datos para TDEE
4. getMondayOfWeek() — weekStart = lunes de la semana actual (UTC 00:00:00)
5. MEALS_BY_COUNT[mealsPerDay] — mapea número de comidas a MealType[] específicos
6. buildPlanPrompt(...) — prompt detallado con datos del paciente y template JSON
7. generateAI(prompt) — Gemini 2.0 Flash non-streaming (max_tokens: 8192 en Groq)
8. extractJson(raw) — strip de markdown fences o extracción por {/} boundaries
9. JSON.parse + planResponseSchema.safeParse — validación Zod estricta
10. Flatten: AI days[] → MealDayRow[] con items A+B por comida
11. plansRepository.create() — $transaction: MealPlan → MealDays → createMany(MealItems)
12. plansRepository.findById(planId) — retorna el plan completo con relaciones
```

### Estructura de datos generada

```
MealPlan
  title: "Plan pérdida de grasa - semana del 28/4/2026"
  weekStart: Date
  days: MealDay[7]
    dayNumber: 1..7
    dayName: "Lunes".."Domingo"
    items: MealItem[]
      mealType: breakfast | morning_snack | lunch | afternoon_snack | dinner | evening_snack
      optionLabel: "A" | "B"
      name, description, calories, proteinG, carbsG, fatG
```

### Decisiones de diseño

**`generateAI()` non-streaming** — Se agregó a `ai-provider.ts` (respetando la regla de no instanciar Gemini/Groq fuera de ese archivo). Usa `model.generateContent()` para Gemini y `chat.completions.create()` sin `stream: true` para Groq. `max_tokens: 8192` en Groq para acomodar planes de 7 días.

**`extractJson()` con fallback** — Tres estrategias en orden: (1) extrae del bloque triple-backtick, (2) slice entre primer `{` y último `}`, (3) raw string trimmeado. Esto cubre la mayoría de variaciones en el output de LLMs.

**Validación con Zod `.safeParse()`** — Se usa `.safeParse()` (excepción a la regla de usar `.parse()`) porque el error debe convertirse en `AppError 500` con código propio, no en `ZodError` que el error handler convertiría en 400.

**Mapeo de comidas** — `MEALS_BY_COUNT` mapea de 1 a 6 comidas a arrays específicos de `MealType`. Valores > 6 se clampean a 6 (máximo de MealTypes disponibles en el schema).

**Transacción de persistencia** — `MealPlan → MealDay (loop) → createMany(MealItems)` dentro de `$transaction`. Los days deben ser secuenciales (cada `MealDay.id` es necesario para sus items), pero los items dentro de cada día se crean en un solo `INSERT` con `createMany`.

---

## Shared: Rate Limit Middleware

**Archivo:** `shared/middleware/rate-limit.middleware.ts`

**Implementación:** Redis INCR/EXPIRE pattern.
- Primera request en la ventana: `INCR` (crea la clave con count=1) + `EXPIRE` (fija el TTL)
- Requests siguientes: `INCR` (incrementa) — la clave ya tiene TTL
- Si `count > maxRequests`: `TTL` para informar el tiempo restante en el mensaje de error

**Fail-open:** Si Redis no responde, la excepción de conexión es capturada y el request pasa normalmente. Prioridad: no bloquear usuarios legítimos por infraestructura.

**Límites configurados:**
- Chat (`/chat/message`): 20 requests / 60 segundos
- Plans (`/plans/generate`): 5 requests / 3600 segundos

**Posición en la cadena de middleware:** Después de `authenticate` (usa `req.user.id` como clave, más preciso que IP para usuarios autenticados).

---

## Shared: `ai-provider.ts` — Extensión

Se agregaron tres funciones privadas y una pública:

- `nonStreamGemini(prompt)` — `model.generateContent(prompt)` → `result.response.text()`
- `nonStreamGroq(prompt)` — `chat.completions.create({ stream: false, max_tokens: 8192 })`
- `generateAI(prompt)` — Factory con el mismo patrón de fallback que `streamAI`: Gemini primero, Groq si hay rate limit 429 o quota excedida, error si ninguno está configurado

El patrón es simétrico con `streamAI` para facilitar el mantenimiento.

---

## Consideraciones de TypeScript

| Problema | Solución |
|----------|----------|
| `Prisma.ProfileUncheckedUpdateInput` incluye `StringFieldUpdateOperationsInput` incompatible con el lado `create` del upsert | Usar `Omit<Prisma.ProfileUncheckedCreateInput, 'userId'>` como tipo del repositorio |
| `MacroTarget` sin index signature no es asignable a `InputJsonObject` de Prisma | Cast `as unknown as Prisma.InputJsonValue` en el return de `computeMetrics` |
| Campos `null` del modelo Prisma no asignables a `string \| undefined` en `ProfileInput` | `toProfileInput()` convierte nulls a undefined con `?? undefined` explícitamente |
| `req.params['id']` tipado como `string \| string[]` por `@types/express` v5 | Cast `as string` en cada uso |
| `Readable.fromWeb` espera `import("stream/web").ReadableStream` pero recibe `ReadableStream<Uint8Array>` del dominio global | Cast `as any` — son el mismo objeto en runtime |

---

## Endpoints completos — Fase 2

```
GET    /health

POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout

GET    /api/v1/profile
PUT    /api/v1/profile
PATCH  /api/v1/profile
GET    /api/v1/profile/macros

GET    /api/v1/records
POST   /api/v1/records
GET    /api/v1/records/latest
PATCH  /api/v1/records/:id
DELETE /api/v1/records/:id

GET    /api/v1/chat/history
POST   /api/v1/chat/message        ← SSE, rate limited
DELETE /api/v1/chat/history

GET    /api/v1/plans
POST   /api/v1/plans/generate      ← AI, rate limited
GET    /api/v1/plans/:id
DELETE /api/v1/plans/:id
```

Total: **23 endpoints**

---

## Para arrancar el servidor

```bash
# Desde la raíz del monorepo
docker-compose up -d

# Desde apps/api
cp .env.example .env
# Editar .env con credenciales reales (JWT secrets, API keys)

npx prisma migrate dev --name fase-2-core
npm run dev
```
