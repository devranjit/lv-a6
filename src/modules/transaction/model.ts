import mongoose, { Schema } from "mongoose"

const TransactionSchema = new Schema({
  type: { type: String, enum: ["deposit","withdraw","send","cashin","cashout"], required: true },
  amount: { type: Number, required: true },
  fee: { type: Number, default: 0 },
  commission: { type: Number, default: 0 },
  status: { type: String, enum: ["completed","pending","reversed"], default: "completed" },
  fromUser: { type: Schema.Types.ObjectId, ref: "User" },
  toUser: { type: Schema.Types.ObjectId, ref: "User" },
  agent: { type: Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true })

export const Transaction = mongoose.models.Transaction || mongoose.model("Transaction", TransactionSchema)
