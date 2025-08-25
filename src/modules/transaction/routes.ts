import { Router } from "express"
import mongoose from "mongoose"
import { Transaction } from "./model"

export function transactionRoutes() {
  const r = Router()
 
  const list = async (req: any, res: any) => {
    const me = req.user as { id: string; role: "user" | "agent" | "admin" }

    const page  = Number(req.query.page  ?? 1) || 1
    const limit = Math.min(100, Number(req.query.limit ?? 10) || 10) // cap
    const type  = (req.query.type as string) || ""
    const from  = req.query.from as string | undefined
    const to    = req.query.to   as string | undefined

    const q: any = {}
    if (type) q.type = type
    if (from || to) {
      q.createdAt = {}
      if (from) q.createdAt.$gte = new Date(from)
      if (to)   q.createdAt.$lte = new Date(to)
    }

    if (me.role === "user") {
      const myId = new mongoose.Types.ObjectId(me.id)
      q.$or = [{ fromUser: myId }, { toUser: myId }]
    } else if (me.role === "agent") {
      q.agent = new mongoose.Types.ObjectId(me.id)
    }
    

    const [items, total] = await Promise.all([
      Transaction.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Transaction.countDocuments(q)
    ])

    res.json({ items, total, page, limit })
  }

  r.get("/", list)    
  r.get("/me", list)  

  return r
}
