import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  transport: isDev
    ? {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:standard" },
      }
    : undefined,
  redact: {
    paths: ["password", "passwordHash", "token", "authorization", "EMAIL_API_KEY", "JWT_SECRET"],
    censor: "[REDACTED]",
  },
});
