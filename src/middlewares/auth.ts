import { Request, Response, NextFunction } from "express"
import { verifyJwt } from "../utils/jwt"

export type Role = "admin" | "user" | "agent"

export function requireAuth(secret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const h = req.headers.authorization || ""
    const token = h.startsWith("Bearer ") ? h.slice(7) : ""
    if (!token) return res.status(401).json({ message: "unauthorized" })
    try {
      const decoded = verifyJwt<{ id: string; role: Role }>(token, secret)
      ;(req as any).user = decoded
      next()
    } catch {
      return res.status(401).json({ message: "unauthorized" })
    }
  }
}

export function requireRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as { id: string; role: Role }
    if (!user || !roles.includes(user.role)) return res.status(403).json({ message: "forbidden" })
    next()
  }
}
