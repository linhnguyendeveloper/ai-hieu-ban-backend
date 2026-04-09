# AI Hieu Ban — Backend API

Express.js + Prisma backend cho AI Hieu Ban platform.

## Yeu cau

- Node.js >= 18
- Docker (cho PostgreSQL local)
- npm

## Cai dat

```bash
npm install
cp .env.example .env   # sua cac gia tri cho phu hop
npx prisma db push     # tao bang trong DB
```

## Moi truong (Environments)

Co 3 moi truong. Chuyen doi bang npm scripts:

| Moi truong | Lenh | File env | Muc dich |
|------------|------|----------|----------|
| **Local** | `npm run dev:local` | `.env` | FE + BE chay tren may |
| **Dev** | `npm run dev:remote` | `.env.development` | BE local, config giong deployed |
| **Prod** | `npm run start:prod` | `.env.production` | Chay tren Railway |

### Local (mac dinh)

Chay ca FE va BE tren may. FE tai `localhost:3000`, BE tai `localhost:3001`.

```bash
# Terminal 1 — Backend
npm run dev:local

# Terminal 2 — Frontend (trong thu muc frontend)
cd ../ai-hieu-ban-frontend
npm run dev
```

Mo `http://localhost:3000` de test.

### Dev (FE local + BE deployed)

FE chay tren may, ket noi toi BE da deploy tren Railway.

```bash
# Terminal 1 — Frontend chi toi deployed BE
cd ../ai-hieu-ban-frontend
npm run dev:remote
```

### Prod (deployed)

Railway tu dong set env vars. File `.env.production` chi de tham khao.

## Scripts

| Lenh | Muc dich |
|------|----------|
| `npm run dev:local` | Chay BE local (doc `.env`) |
| `npm run dev:remote` | Chay BE local voi config dev (doc `.env.development`) |
| `npm run build` | Build TypeScript |
| `npm run start` | Start production (push DB + run) |
| `npm run start:prod` | Start voi `.env.production` |
| `npm run db:push` | Dong bo Prisma schema voi DB |
| `npm run db:migrate` | Tao migration moi |
| `npm run db:studio` | Mo Prisma Studio (GUI) |

## Cau truc

```
src/
├── index.ts              # Express app entry
├── config.ts             # Env config loader
├── lib/
│   ├── prisma.ts         # Prisma client
│   └── passport.ts       # Google OAuth strategy
├── middleware/
│   ├── auth.ts           # JWT auth middleware
│   └── tier-check.ts     # Free/Premium tier check
├── routes/
│   ├── auth.ts           # /api/v1/auth/*
│   ├── characters.ts     # /api/v1/characters/*
│   ├── chat.ts           # /api/v1/chat/*
│   ├── payment.ts        # /api/v1/checkout, /api/v1/orders
│   └── webhook.ts        # /api/v1/webhooks/sepay
├── services/
│   └── sepay.ts          # SePay payment client
└── data/
    ├── mock-characters.ts # 10 nhan vat mau
    └── mock-responses.ts  # Tin nhan mau cho mock AI
```

## API Endpoints

| Method | Path | Auth | Mo ta |
|--------|------|------|-------|
| GET | `/api/v1/health` | - | Health check |
| GET | `/api/v1/auth/google` | - | Bat dau Google OAuth |
| GET | `/api/v1/auth/google/callback` | - | OAuth callback |
| GET | `/api/v1/auth/me` | JWT | Lay thong tin user |
| POST | `/api/v1/auth/logout` | - | Dang xuat |
| GET | `/api/v1/characters` | - | Danh sach nhan vat |
| GET | `/api/v1/characters/featured` | - | Nhan vat noi bat |
| GET | `/api/v1/characters/:id` | - | Chi tiet nhan vat |
| POST | `/api/v1/characters` | Optional | Tao nhan vat |
| GET | `/api/v1/chat/:id/messages` | Optional | Lich su chat |
| POST | `/api/v1/chat/:id/messages` | Optional | Gui tin nhan |
| POST | `/api/v1/checkout` | JWT | Tao thanh toan SePay |
| GET | `/api/v1/orders` | JWT | Lich su don hang |
| POST | `/api/v1/webhooks/sepay` | - | SePay IPN webhook |
