import mongoose, { Schema, model } from "mongoose";
const settingSchema = new Schema({
    commissionBps: { type: Number, required: true, default: 0 },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });
export const Setting = mongoose.models.Setting ||
    model("Setting", settingSchema);
export default Setting;
