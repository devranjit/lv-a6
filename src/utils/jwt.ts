import jwt from "jsonwebtoken"
export function signJwt(payload: object, secret: string) { return jwt.sign(payload, secret, { expiresIn: "7d" }) }
export function verifyJwt<T=any>(token: string, secret: string) { return jwt.verify(token, secret) as T }
