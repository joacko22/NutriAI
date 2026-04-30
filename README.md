# NutriAI 🥗

Plataforma de nutrición personalizada con AI. Portfolio + producto real.

## Stack

- **Backend**: Node.js 20 + Express + TypeScript + Prisma
- **Base de datos**: PostgreSQL 16 + Redis
- **AI**: Gemini 2.0 Flash (gratis) + Groq Llama 3.3 70B (fallback)
- **Auth**: JWT RS256 + Google OAuth 2.0
- **Frontend**: React + Vite *(Fase 3)*
- **Mobile**: React Native + Expo *(Fase 3)*

## Inicio rápido

### Requisitos
- Node.js 20+
- Docker + Docker Compose

### Setup

```bash
# 1. Clonar e instalar dependencias
git clone <repo>
cd nutriai
npm install

# 2. Levantar PostgreSQL y Redis
docker-compose up -d

# 3. Configurar variables de entorno
cp apps/api/.env.example apps/api/.env
# Editar .env con tus valores

# 4. Generar secretos JWT
node -e "const c=require('crypto');console.log('ACCESS:',c.randomBytes(64).toString('hex'));console.log('REFRESH:',c.randomBytes(64).toString('hex'))"

# 5. Aplicar migraciones
cd apps/api
npx prisma migrate dev --name init
npx prisma generate

# 6. Iniciar la API
npm run dev
```

### Verificar

```bash
curl http://localhost:3001/health
# → {"status":"ok","ts":"...","env":"development"}

curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
# → {"accessToken":"...","refreshToken":"...","user":{...}}
```

## Estructura

```
nutriai/
├── apps/
│   ├── api/              → Backend Express (puerto 3001)
│   │   ├── src/
│   │   │   ├── config/   → Prisma, Redis, variables de entorno
│   │   │   ├── modules/  → auth, profile, chat, plans, records
│   │   │   └── shared/   → middlewares, utils (JWT, Harris-Benedict, AI)
│   │   └── prisma/       → schema + migrations
│   ├── web/              → React + Vite [Fase 3]
│   └── mobile/           → React Native + Expo [Fase 3]
└── packages/
    └── shared/           → Tipos TypeScript compartidos
```

## AI Keys

- **Gemini**: [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) — gratis, 1500 req/día
- **Groq**: [console.groq.com/keys](https://console.groq.com/keys) — gratis, fallback automático

## Comandos útiles

```bash
docker-compose up -d                    # Iniciar DB + Redis
docker-compose down                     # Detener servicios
npx prisma studio                       # GUI visual de la BD
npx prisma migrate dev --name <nombre>  # Nueva migración
```

## Documentación

- `CLAUDE.md` — Context Engineering para Claude Code
- `docs/` — PRD v1.0 y Architecture Decision Record (ADR)
