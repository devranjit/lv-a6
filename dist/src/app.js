import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import { authRoutes } from "./modules/auth/routes";
import { walletRoutes } from "./modules/wallet/routes";
import { transactionRoutes } from "./modules/transaction/routes";
import { adminRoutes } from "./modules/admin/routes";
import { agentRoutes } from "./modules/agent/routes";
import { requireAuth, requireRole } from "./middlewares/auth";
export function createApp(env) {
    const app = express();
    app.use(cors());
    app.use(helmet());
    app.use(morgan("dev"));
    app.use(express.json());
    app.get("/favicon.ico", (_req, res) => res.status(204).end());
    app.get("/", (_req, res) => {
        const base = `http://localhost:${process.env.PORT || 4000}`;
        res.type("html").send(`<!doctype html><meta charset="utf-8"><title>Digital Wallet API</title>
      <style>body{font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Arial;padding:32px}
      .box{border:1px solid #e5e7eb;border-radius:14px;padding:20px;max-width:560px}
      a{color:#2563eb;text-decoration:none}</style>
      <div class="box">
        <h1>Digital Wallet API</h1>
        <p>Server running at <b>${base}</b></p>
        <p>Health: <a href="/api/health">${base}/api/health</a></p>
      </div>`);
    });
    app.get("/api/health", (_req, res) => {
        res.json({ ok: true, db: mongoose.connection.readyState });
    });
    app.use("/api/auth", authRoutes({ jwt: env.jwt, initialBalance: env.initialBalance }));
    app.use("/api/wallet", requireAuth(env.jwt), requireRole(["user", "agent", "admin"]), walletRoutes());
    app.use("/api/transactions", requireAuth(env.jwt), transactionRoutes());
    app.use("/api/agent", requireAuth(env.jwt), requireRole(["agent"]), agentRoutes({ commissionBps: env.commissionBps }));
    app.use("/api/admin", requireAuth(env.jwt), requireRole(["admin"]), adminRoutes());
    return app;
}
