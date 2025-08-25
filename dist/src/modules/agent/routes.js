import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { Wallet } from "../wallet/model";
import { Transaction } from "../transaction/model";
import { User } from "../user/model";
import Setting from "../settings/model";
export function agentRoutes(env) {
    const r = Router();
    r.get("/summary", async (req, res) => {
        const agentId = req.user.id;
        const [cashins, cashouts, recentAgg, commissionAgg] = await Promise.all([
            Transaction.countDocuments({ agent: agentId, type: "cashin" }),
            Transaction.countDocuments({ agent: agentId, type: "cashout" }),
            Transaction.find({ agent: agentId }).sort({ createdAt: -1 }).limit(5),
            Transaction.aggregate([
                { $match: { agent: new mongoose.Types.ObjectId(agentId), type: "cashin" } },
                { $group: { _id: null, total: { $sum: "$commission" } } }
            ])
        ]);
        const totalCommission = commissionAgg[0]?.total || 0;
        res.json({ cashins, cashouts, totalCommission, recent: recentAgg });
    });
    r.get("/transactions", async (req, res) => {
        const agentId = req.user.id;
        const page = parseInt(String(req.query.page ?? "1"), 10);
        const limit = parseInt(String(req.query.limit ?? "10"), 10);
        const type = req.query.type || "";
        const from = req.query.from;
        const to = req.query.to;
        const q = { agent: new mongoose.Types.ObjectId(agentId) };
        if (type)
            q.type = type;
        if (from || to) {
            q.createdAt = {};
            if (from)
                q.createdAt.$gte = new Date(from);
            if (to)
                q.createdAt.$lte = new Date(to);
        }
        const [items, total] = await Promise.all([
            Transaction.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
            Transaction.countDocuments(q)
        ]);
        res.json({ items, total, page, limit });
    });
    r.post("/cashin", async (req, res) => {
        const agentId = req.user.id;
        const schema = z.object({ user: z.string().email(), amount: z.coerce.number().positive() });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ message: "invalid" });
        const { user, amount } = parsed.data;
        const target = await User.findOne({ email: user });
        if (!target)
            return res.status(404).json({ message: "user_not_found" });
        const w = await Wallet.findOneAndUpdate({ user: target._id, blocked: { $ne: true } }, { $inc: { balance: amount } }, { new: true });
        if (!w)
            return res.status(404).json({ message: "wallet_not_found_or_blocked" });
        const s = await Setting.findOne();
        const bps = s?.commissionBps ?? env.commissionBps;
        const commission = Math.floor((amount * bps) / 10000);
        await Transaction.create({
            type: "cashin",
            amount,
            commission,
            toUser: target._id,
            agent: agentId,
            status: "completed"
        });
        res.json({ ok: true });
    });
    r.post("/cashout", async (req, res) => {
        const agentId = req.user.id;
        const schema = z.object({ user: z.string().email(), amount: z.coerce.number().positive() });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ message: "invalid" });
        const { user, amount } = parsed.data;
        const target = await User.findOne({ email: user });
        if (!target)
            return res.status(404).json({ message: "user_not_found" });
        const w = await Wallet.findOneAndUpdate({ user: target._id, blocked: { $ne: true }, balance: { $gte: amount } }, { $inc: { balance: -amount } }, { new: true });
        if (!w) {
            const exists = await Wallet.findOne({ user: target._id });
            if (!exists)
                return res.status(404).json({ message: "wallet_not_found" });
            if (exists.blocked)
                return res.status(400).json({ message: "wallet_blocked" });
            return res.status(400).json({ message: "insufficient_balance" });
        }
        await Transaction.create({
            type: "cashout",
            amount,
            fromUser: target._id,
            agent: agentId,
            status: "completed"
        });
        res.json({ ok: true });
    });
    return r;
}
