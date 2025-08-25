import type { VercelRequest, VercelResponse } from "@vercel/node"
import { createApp } from "../src/app"
import { connectDB } from "../src/config/db"

export const config = { runtime: "nodejs18.x" }

const mongo = process.env.MONGO_URI as string
const jwt = process.env.JWT_SECRET as string
const initial = parseInt(process.env.INITIAL_BALANCE || "50", 10)
const bps = parseInt(process.env.AGENT_COMMISSION_BPS || "100", 10)

const app = createApp({ jwt, initialBalance: initial, commissionBps: bps })

let ready = false
async function ensure() {
  if (!ready) {
    await connectDB(mongo)
    ready = true
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensure()
  return (app as any)(req, res)
}
