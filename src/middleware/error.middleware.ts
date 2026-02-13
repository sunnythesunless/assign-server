import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { config } from "../config";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: err.message,
        });
        return;
    }

    // Log unexpected errors
    console.error("❌ Unexpected error:", err);

    res.status(500).json({
        success: false,
        error: config.NODE_ENV === "production" ? "Internal server error" : err.message,
    });
}
