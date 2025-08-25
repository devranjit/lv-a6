import mongoose, { Schema, model } from "mongoose"

type SettingDoc = {
  commissionBps: number
  updatedBy?: mongoose.Types.ObjectId
}

const settingSchema = new Schema<SettingDoc>(
  {
    commissionBps: { type: Number, required: true, default: 0 },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
)

export const Setting =
  (mongoose.models.Setting as mongoose.Model<SettingDoc>) ||
  model<SettingDoc>("Setting", settingSchema)

export default Setting
