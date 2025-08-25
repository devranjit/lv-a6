import mongoose, { Schema } from "mongoose";
const UserSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "user", "agent"], default: "user", index: true },
    agentStatus: { type: String, enum: ["pending", "approved", "suspended"], default: "approved" }
}, { timestamps: true });
export const User = mongoose.models.User || mongoose.model("User", UserSchema);
