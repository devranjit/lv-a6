import { verifyJwt } from "../utils/jwt";
export function requireAuth(secret) {
    return (req, res, next) => {
        const h = req.headers.authorization || "";
        const token = h.startsWith("Bearer ") ? h.slice(7) : "";
        if (!token)
            return res.status(401).json({ message: "unauthorized" });
        try {
            const decoded = verifyJwt(token, secret);
            req.user = decoded;
            next();
        }
        catch {
            return res.status(401).json({ message: "unauthorized" });
        }
    };
}
export function requireRole(roles) {
    return (req, res, next) => {
        const user = req.user;
        if (!user || !roles.includes(user.role))
            return res.status(403).json({ message: "forbidden" });
        next();
    };
}
