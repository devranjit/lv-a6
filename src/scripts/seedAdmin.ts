import "dotenv/config"
import mongoose from "mongoose"
import { User } from "../modules/user/model"
import { Wallet } from "../modules/wallet/model"
import { hashPassword } from "../utils/crypto"

async function main() {
  const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/digital_wallet"
  await mongoose.connect(MONGO_URI)

  const email = process.env.ADMIN_EMAIL || "admin@example.com"
  const password = process.env.ADMIN_PASSWORD || "admin123"
  const name = process.env.ADMIN_NAME || "Admin"
  const initBal = Number(process.env.INITIAL_BALANCE ?? 50) || 50

  let user = await User.findOne({ email })
  if (user) {
    if (user.role !== "admin") {
      user.role = "admin"
      await user.save()
      console.log(`Updated existing user to admin: ${email}`)
    } else {
      console.log(`Admin already exists: ${email}`)
    }
  } else {
    user = await User.create({
      name,
      email,
      password: await hashPassword(password),
      role: "admin",
    })
    await Wallet.create({ user: user._id, balance: initBal }) 
    console.log(`Created admin: ${email} / ${password}`)
  }

  await mongoose.disconnect()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
