Digital Wallet API

Env
cp .env.example .env
Set MONGO_URI and JWT_SECRET.

Local
npm i
npm run dev

Vercel
Add env vars MONGO_URI, JWT_SECRET, INITIAL_BALANCE, AGENT_COMMISSION_BPS.
Deploy. The API base path is /api.
