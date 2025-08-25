import "dotenv/config"
import mongoose from "mongoose"
import { createApp } from "./app"

async function main() {
  const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/digital_wallet"
  await mongoose.connect(MONGO_URI)

  const env = {
    jwt: process.env.JWT_SECRET || "secret",
    initialBalance: Number(process.env.INITIAL_BALANCE ?? 50) || 50,
    commissionBps: Number(process.env.COMMISSION_BPS ?? 100) || 100
  }

  const app = createApp(env)
  const PORT = Number(process.env.PORT || 4000)
  app.listen(PORT, () => {
    console.log("db:connected")
    console.log(`api:${PORT}`)
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
