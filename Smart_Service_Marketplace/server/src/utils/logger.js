import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import env from "../config/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.resolve(
  process.cwd(),
  env.LOG_DIR || "logs"
);

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(
    ({ timestamp, level, message, ...meta }) => {
      const extra = Object.keys(meta).length
        ? ` ${JSON.stringify(meta)}`
        : "";
      return `${timestamp} [${level}]: ${message}${extra}`;
    }
  )
);

function createRotateTransport(filename, level) {
  return new DailyRotateFile({
    dirname: LOG_DIR,
    filename,
    datePattern: "YYYY-MM-DD",
    maxFiles: env.LOG_MAX_FILES || "14d",
    maxSize: env.LOG_MAX_SIZE || "20m",
    zippedArchive: true,
    level,
  });
}

const logger = winston.createLogger({
  level: env.LOG_LEVEL || "info",
  defaultMeta: { service: "smart-service-api" },
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    createRotateTransport("app-%DATE%.log", "info"),
  ],
});

export const errorLogger = winston.createLogger({
  level: "error",
  defaultMeta: { service: "smart-service-api", logType: "error" },
  format: jsonFormat,
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    createRotateTransport("error-%DATE%.log", "error"),
  ],
});

export const requestLogger = winston.createLogger({
  level: "info",
  defaultMeta: { service: "smart-service-api", logType: "request" },
  format: jsonFormat,
  transports: [createRotateTransport("request-%DATE%.log", "info")],
});

export const httpLogger = winston.createLogger({
  level: "info",
  defaultMeta: { service: "smart-service-api", logType: "http" },
  format: jsonFormat,
  transports: [createRotateTransport("http-%DATE%.log", "info")],
});

export default logger;
