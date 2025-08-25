import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { Wallet } from "./model";
import { Transaction } from "../transaction/model";
import { User } from "../user/model";
export function walletRoutes() {
    const r = Router();
    r.get("/summary", async (req, res) => {
        const uid = req.user.id;
        const w = await Wallet.findOne({ user: uid });
        if (!w)
            return res.status(404).json({ message: "wallet_not_found" });
        const recent = await Transaction.find({
            $or: [{ fromUser: uid }, { toUser: uid }]
        })
            .sort({ createdAt: -1 })
            .limit(5);
        res.json({ balance: w.balance, recent });
    });
    r.post("/deposit", async (req, res) => {
        const uid = req.user.id;
        const schema = z.object({ amount: z.coerce.number().positive() });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ message: "invalid" });
        const { amount } = parsed.data;
        const w = await Wallet.findOneAndUpdate({ user: uid, blocked: { $ne: true } }, { $inc: { balance: amount } }, { new: true });
        if (!w)
            return res.status(404).json({ message: "wallet_not_found_or_blocked" });
        await Transaction.create({
            type: "deposit",
            amount,
            fromUser: new mongoose.Types.ObjectId(uid),
            status: "completed"
        });
        res.json({ ok: true });
    });
    r.post("/withdraw", async (req, res) => {
        const uid = req.user.id;
        const schema = z.object({ amount: z.coerce.number().positive() });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ message: "invalid" });
        const { amount } = parsed.data;
        const w = await Wallet.findOneAndUpdate({ user: uid, blocked: { $ne: true }, balance: { $gte: amount } }, { $inc: { balance: -amount } }, { new: true });
        if (!w) {
            const exists = await Wallet.findOne({ user: uid });
            if (!exists)
                return res.status(404).json({ message: "wallet_not_found" });
            if (exists.blocked)
                return res.status(400).json({ message: "wallet_blocked" });
            return res.status(400).json({ message: "insufficient_balance" });
        }
        await Transaction.create({
            type: "withdraw",
            amount,
            fromUser: new mongoose.Types.ObjectId(uid),
            status: "completed"
        });
        res.json({ ok: true });
    });
    r.post("/send", async (req, res) => {
        const uid = req.user.id;
        const schema = z.object({
            to: z.string(),
            amount: z.coerce.number().positive()
        });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ message: "invalid" });
        const { to, amount } = parsed.data;
        const receiver = (await User.findOne({ email: to })) ||
            (mongoose.isValidObjectId(to) ? await User.findById(to) : null);
        if (!receiver)
            return res.status(404).json({ message: "receiver_not_found" });
        if (receiver._id.toString() === uid) {
            return res.status(400).json({ message: "invalid_receiver" });
        }
        const wFrom = await Wallet.findOneAndUpdate({ user: uid, blocked: { $ne: true }, balance: { $gte: amount } }, { $inc: { balance: -amount } }, { new: true });
        if (!wFrom) {
            const exists = await Wallet.findOne({ user: uid });
            if (!exists)
                return res.status(404).json({ message: "wallet_not_found" });
            if (exists.blocked)
                return res.status(400).json({ message: "wallet_blocked" });
            return res.status(400).json({ message: "insufficient_balance" });
        }
        const wTo = await Wallet.findOneAndUpdate({ user: receiver._id, blocked: { $ne: true } }, { $inc: { balance: amount } }, { new: true });
        if (!wTo) {
            await Wallet.updateOne({ user: uid }, { $inc: { balance: amount } });
            return res.status(404).json({ message: "receiver_wallet_not_found_or_blocked" });
        }
        await Transaction.create({
            type: "send",
            amount,
            fromUser: new mongoose.Types.ObjectId(uid),
            toUser: receiver._id,
            status: "completed"
        });
        res.json({ ok: true });
    });
    return r;
}
