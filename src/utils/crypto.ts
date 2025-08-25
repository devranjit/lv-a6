import bcrypt from "bcryptjs"
export async function hashPassword(p: string) { return bcrypt.hash(p, 10) }
export async function comparePassword(p: string, h: string) { return bcrypt.compare(p, h) }
