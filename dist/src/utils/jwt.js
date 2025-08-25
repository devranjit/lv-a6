import jwt from "jsonwebtoken";
export function signJwt(payload, secret) { return jwt.sign(payload, secret, { expiresIn: "7d" }); }
export function verifyJwt(token, secret) { return jwt.verify(token, secret); }
