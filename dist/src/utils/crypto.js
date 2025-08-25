import bcrypt from "bcryptjs";
export async function hashPassword(p) { return bcrypt.hash(p, 10); }
export async function comparePassword(p, h) { return bcrypt.compare(p, h); }
