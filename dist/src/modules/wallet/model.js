import mongoose, { Schema } from "mongoose";
const WalletSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    balance: { type: Number, required: true, default: 0 },
    blocked: { type: Boolean, default: false }
}, { timestamps: true });
export const Wallet = mongoose.models.Wallet || mongoose.model("Wallet", WalletSchema);
