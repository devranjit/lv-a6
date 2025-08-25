import { Router } from "express";
import { z } from "zod";
import { User } from "../user/model";
import { hashPassword, comparePassword } from "../../utils/crypto";
import { signJwt } from "../../utils/jwt";
import { Wallet } from "../wallet/model";
import bcrypt from "bcryptjs";
export function authRoutes(env) {
    const r = Router();
    r.post("/register", async (req, res) => {
        const schema = z.object({
            name: z.string().min(2),
            email: z.string().email(),
            password: z.string().min(6),
            role: z.enum(["user", "agent"]).default("user")
        });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ message: "invalid" });
        const { name, email, password, role } = parsed.data;
        const exists = await User.findOne({ email });
        if (exists)
            return res.status(400).json({ message: "email_exists" });
        const hashed = await hashPassword(password);
        const user = await User.create({
            name,
            email,
            password: hashed,
            role,
            agentStatus: role === "agent" ? "pending" : "approved"
        });
        await Wallet.create({ user: user._id, balance: env.initialBalance });
        const token = signJwt({ id: user._id.toString(), role: user.role }, env.jwt);
        const dto = { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
        res.json({ token, user: dto });
    });
    r.post("/login", async (req, res) => {
        const schema = z.object({ email: z.string().email(), password: z.string().min(6) });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ message: "invalid" });
        const { email, password } = parsed.data;
        const user = await User.findOne({ email }).select("+password");
        if (!user)
            return res.status(401).json({ message: "invalid_credentials" });
        const ok = await comparePassword(password, user.password);
        if (!ok)
            return res.status(401).json({ message: "invalid_credentials" });
        const token = signJwt({ id: user._id.toString(), role: user.role }, env.jwt);
        const dto = { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
        res.json({ token, user: dto });
    });
    r.get("/me", async (req, res) => {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: "unauthorized" });
        const user = await User.findById(userId);
        if (!user)
            return res.status(404).json({ message: "not_found" });
        const dto = { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
        res.json(dto);
    });
    r.patch("/me", async (req, res) => {
        const uid = req.user.id;
        const schema = z.object({ name: z.string().min(2) });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ message: "invalid" });
        const user = await User.findByIdAndUpdate(uid, { $set: { name: parsed.data.name } }, { new: true });
        if (!user)
            return res.status(404).json({ message: "not_found" });
        res.json({ id: user._id, name: user.name, email: user.email, role: user.role });
    });
    r.patch("/password", async (req, res) => {
        const uid = req.user.id;
        const schema = z.object({ currentPassword: z.string().min(6), newPassword: z.string().min(6) });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ message: "invalid" });
        const user = await User.findById(uid).select("+password");
        if (!user)
            return res.status(404).json({ message: "not_found" });
        const ok = await bcrypt.compare(parsed.data.currentPassword, user.password);
        if (!ok)
            return res.status(400).json({ message: "invalid" });
        user.password = await bcrypt.hash(parsed.data.newPassword, 10);
        await user.save();
        res.json({ ok: true });
    });
    return r;
}
