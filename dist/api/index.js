import { createApp } from "../src/app";
import { connectDB } from "../src/config/db";
const mongo = process.env.MONGO_URI;
const jwt = process.env.JWT_SECRET;
const initial = parseInt(process.env.INITIAL_BALANCE || "50", 10);
const bps = parseInt(process.env.AGENT_COMMISSION_BPS || "100", 10);
let ready = false;
const app = createApp({ jwt, initialBalance: initial, commissionBps: bps });
export const config = { runtime: "nodejs" };
async function ensure() {
    if (!ready) {
        await connectDB(mongo);
        ready = true;
    }
}
export default async function handler(req, res) {
    await ensure();
    app(req, res);
}
