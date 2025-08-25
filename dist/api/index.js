import serverless from "serverless-http";
import { createApp } from "../src/app";
import { connectDB } from "../src/config/db";
const mongo = process.env.MONGO_URI;
const jwt = process.env.JWT_SECRET;
const initial = parseInt(process.env.INITIAL_BALANCE || "50", 10);
const bps = parseInt(process.env.AGENT_COMMISSION_BPS || "100", 10);
let ready = false;
const app = createApp({ jwt, initialBalance: initial, commissionBps: bps });
async function ensure() {
    if (!ready) {
        await connectDB(mongo);
        ready = true;
    }
}
const handler = async (event, context) => {
    await ensure();
    const h = serverless(app);
    return h(event, context);
};
export default handler;
