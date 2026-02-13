import { z } from "zod";

const envSchema = z.object({
    DATABASE_URL: z.string().default("file:./dev.db"),
    JWT_SECRET: z.string().default("invoice-app-super-secret-key-change-in-production"),
    PORT: z.coerce.number().default(3001),
    CORS_ORIGIN: z.string().default("http://localhost:5173"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export const config = envSchema.parse(process.env);
export type Config = z.infer<typeof envSchema>;
