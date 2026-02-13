import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { UnauthorizedError } from "../utils/errors";

export interface AuthRequest extends Request {
    userId?: number;
}

export function authMiddleware(req: AuthRequest, _res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new UnauthorizedError("No token provided");
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: number };
        req.userId = decoded.userId;
        next();
    } catch {
        throw new UnauthorizedError("Invalid or expired token");
    }
}

/**
 * Optional auth — attaches userId if token present, but doesn't block.
 * Used for endpoints that work with or without auth.
 */
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
            const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: number };
            req.userId = decoded.userId;
        } catch {
            // Token invalid, but that's okay — proceed without auth
        }
    }

    next();
}
