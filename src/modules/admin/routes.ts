import { Router } from "express"
import { z } from "zod"
import mongoose from "mongoose"
import { User } from "../user/model"
import { Wallet } from "../wallet/model"
import { Transaction } from "../transaction/model"
import Setting from "../settings/model"

export function adminRoutes() {
  const r = Router()

  r.get("/overview", async (_req, res) => {
    const [users, agents, txCount, txSumAgg] = await Promise.all([
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "agent", agentStatus: "approved" }),
      Transaction.countDocuments({}),
      Transaction.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }])
    ])
    const totalVolume = txSumAgg[0]?.total || 0
    res.json({ users, agents, transactions: txCount, volume: totalVolume })
  })

  r.get("/users", async (req, res) => {
    const page = parseInt(String(req.query.page ?? "1"), 10)
    const limit = parseInt(String(req.query.limit ?? "10"), 10)
    const q = (req.query.q as string) || ""
    const role = (req.query.role as string) || ""
    const status = (req.query.status as string) || ""
    const where: any = {}
    if (q) where.$or = [{ name: { $regex: q, $options: "i" } }, { email: { $regex: q, $options: "i" } }]
    if (role) where.role = role

    const [items, total] = await Promise.all([
      User.find(where).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      User.countDocuments(where)
    ])

    const ids = items.map(u => u._id)
    const wallets = await Wallet.find({ user: { $in: ids } })
    const map = new Map(wallets.map(w => [String(w.user), w]))

    const data = items.map(u => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      agentStatus: u.agentStatus,
      walletBlocked: map.get(String(u._id))?.blocked || false,
      balance: map.get(String(u._id))?.balance || 0
    }))

    let filtered = data
    if (status === "blocked") filtered = data.filter(d => d.walletBlocked)
    if (status === "active") filtered = data.filter(d => !d.walletBlocked)
    if (status === "pending") filtered = data.filter(d => d.role === "agent" && d.agentStatus === "pending")
    if (status === "suspended") filtered = data.filter(d => d.role === "agent" && d.agentStatus === "suspended")
    if (status === "approved") filtered = data.filter(d => d.role === "agent" && d.agentStatus === "approved")

    res.json({ items: filtered, total, page, limit })
  })

  r.patch("/users/:id/block", async (req, res) => {
    const uid = req.params.id
    const w = await Wallet.findOneAndUpdate({ user: uid }, { $set: { blocked: true } }, { new: true, upsert: false })
    if (!w) return res.status(404).json({ message: "wallet_not_found" })
    res.json({ ok: true })
  })

  r.patch("/users/:id/unblock", async (req, res) => {
    const uid = req.params.id
    const w = await Wallet.findOneAndUpdate({ user: uid }, { $set: { blocked: false } }, { new: true, upsert: false })
    if (!w) return res.status(404).json({ message: "wallet_not_found" })
    res.json({ ok: true })
  })

  r.patch("/agents/:id/approve", async (req, res) => {
    const uid = req.params.id
    const u = await User.findByIdAndUpdate(uid, { $set: { agentStatus: "approved" } }, { new: true })
    if (!u) return res.status(404).json({ message: "not_found" })
    res.json({ ok: true })
  })

  r.patch("/agents/:id/suspend", async (req, res) => {
    const uid = req.params.id
    const u = await User.findByIdAndUpdate(uid, { $set: { agentStatus: "suspended" } }, { new: true })
    if (!u) return res.status(404).json({ message: "not_found" })
    res.json({ ok: true })
  })

  r.get("/transactions", async (req, res) => {
    const page = parseInt(String(req.query.page ?? "1"), 10)
    const limit = parseInt(String(req.query.limit ?? "10"), 10)
    const type = (req.query.type as string) || ""
    const status = (req.query.status as string) || ""
    const from = req.query.from as string | undefined
    const to = req.query.to as string | undefined
    const minAmount = req.query.minAmount ? Number(req.query.minAmount) : undefined
    const maxAmount = req.query.maxAmount ? Number(req.query.maxAmount) : undefined
    const who = (req.query.q as string) || ""

    const q: any = {}
    if (type) q.type = type
    if (status) q.status = status
    if (from || to) {
      q.createdAt = {}
      if (from) q.createdAt.$gte = new Date(from)
      if (to) q.createdAt.$lte = new Date(to)
    }
    if (minAmount !== undefined || maxAmount !== undefined) {
      q.amount = {}
      if (minAmount !== undefined) q.amount.$gte = minAmount
      if (maxAmount !== undefined) q.amount.$lte = maxAmount
    }
    if (who) {
      const users = await User.find({ email: { $regex: who, $options: "i" } }).select("_id")
      const ids = users.map(u => u._id)
      if (ids.length) q.$or = [{ fromUser: { $in: ids } }, { toUser: { $in: ids } }, { agent: { $in: ids } }]
      else q.$or = [{ _id: new mongoose.Types.ObjectId("000000000000000000000000") }]
    }

    const [items, total] = await Promise.all([
      Transaction.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Transaction.countDocuments(q)
    ])

    res.json({ items, total, page, limit })
  })

  r.get("/settings", async (_req, res) => {
    const s = await Setting.findOne()
    res.json({ commissionBps: s?.commissionBps ?? 100 })
  })

  r.patch("/settings", async (req, res) => {
    const schema = z.object({ commissionBps: z.coerce.number().int().min(0).max(10000) })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: "invalid" })
    const s = await Setting.findOneAndUpdate({}, { $set: { commissionBps: parsed.data.commissionBps } }, { new: true, upsert: true })
    res.json({ commissionBps: s.commissionBps })
  })

  r.patch("/me", async (req, res) => {
    const uid = (req as any).user.id
    const schema = z.object({ name: z.string().min(2) })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: "invalid" })
    const u = await User.findByIdAndUpdate(uid, { $set: { name: parsed.data.name } }, { new: true })
    if (!u) return res.status(404).json({ message: "not_found" })
    res.json({ id: u._id, name: u.name, email: u.email, role: u.role })
  })

  return r
}
