import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import prisma from "../../config/database";
import { config } from "../../config";
import { AppError, ValidationError, ConflictError, UnauthorizedError } from "../../utils/errors";

const router = Router();

// ── Validation schemas ──────────────────────────────────────────────────────

const registerSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    name: z.string().min(1, "Name is required").max(100),
});

const loginSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
});

// ── Helper ──────────────────────────────────────────────────────────────────

function generateToken(userId: number): string {
    return jwt.sign({ userId }, config.JWT_SECRET, { expiresIn: "24h" });
}

// ── POST /api/auth/register ─────────────────────────────────────────────────

router.post("/register", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new ValidationError(parsed.error.errors.map((e) => e.message).join(", "));
        }

        const { email, password, name } = parsed.data;

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new ConflictError("User with this email already exists");
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: { email, password: hashedPassword, name },
        });

        const token = generateToken(user.id);

        res.status(201).json({
            success: true,
            data: {
                user: { id: user.id, email: user.email, name: user.name },
                token,
            },
        });
    } catch (err) {
        next(err);
    }
});

// ── POST /api/auth/login ────────────────────────────────────────────────────

router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new ValidationError(parsed.error.errors.map((e) => e.message).join(", "));
        }

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new UnauthorizedError("Invalid email or password");
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedError("Invalid email or password");
        }

        const token = generateToken(user.id);

        res.json({
            success: true,
            data: {
                user: { id: user.id, email: user.email, name: user.name },
                token,
            },
        });
    } catch (err) {
        next(err);
    }
});

// ── GET /api/auth/me ────────────────────────────────────────────────────────

router.get("/me", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedError("No token provided");
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: number };

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, name: true, createdAt: true },
        });

        if (!user) {
            throw new UnauthorizedError("User not found");
        }

        res.json({ success: true, data: { user } });
    } catch (err) {
        if (err instanceof jwt.JsonWebTokenError) {
            next(new UnauthorizedError("Invalid token"));
        } else {
            next(err);
        }
    }
});

export default router;
