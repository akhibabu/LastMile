import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("7d"),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  BACKEND_URL: z.string().default("http://localhost:4000"),
  EMAIL_PROVIDER: z.enum(["resend", "sendgrid", "mailgun", "dev"]).default("dev"),
  RESEND_API_KEY: z.string().optional().default(""),
  EMAIL_API_KEY: z.string().optional().default(""),
  FROM_EMAIL: z.string().default("noreply@lastmile.local"),
  FROM_NAME: z.string().default("LastMile"),
  GEOCODING_USER_AGENT: z.string().default("LastMileDelivery/1.0"),
  GEOCODING_API_KEY: z.string().optional().default(""),
  LOCATION_UPDATE_INTERVAL: z.coerce.number().int().positive().default(30_000),
  LOCATION_STALE_THRESHOLD: z.coerce.number().int().positive().default(300_000),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export const isProduction = () => loadEnv().NODE_ENV === "production";

export function resendApiKey(env: Env = loadEnv()): string {
  return env.RESEND_API_KEY || env.EMAIL_API_KEY || "";
}
