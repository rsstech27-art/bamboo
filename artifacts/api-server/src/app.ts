import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import router from "./routes";
import { logger } from "./lib/logger";

const SESSION_SECRET = process.env["SESSION_SECRET"];
if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required.");
}

// ── CORS: restrict to known application origins ───────────────────────────────
// ALLOWED_ORIGINS may be a comma-separated list; falls back to the Replit
// preview domain injected at runtime, or localhost for local development.
const rawOrigins = process.env["ALLOWED_ORIGINS"] ?? process.env["REPLIT_DOMAINS"] ?? "";
const allowedOrigins: Set<string> = rawOrigins.trim()
  ? new Set(
      rawOrigins
        .split(",")
        .map(o => o.trim())
        .filter(Boolean)
        .flatMap(o => [
          o.startsWith("http") ? o : `https://${o}`,
          o.startsWith("http") ? o : `http://${o}`,
        ]),
    )
  : new Set(["http://localhost:18141", "http://localhost:3000"]);

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  // Exact match or suffix match for *.replit.dev / *.replit.app
  if (allowedOrigins.has(origin)) return true;
  return (
    /\.replit\.dev$/.test(origin) ||
    /\.replit\.app$/.test(origin) ||
    /^http:\/\/localhost(:\d+)?$/.test(origin)
  );
}

// ── Session store: PostgreSQL via connect-pg-simple ───────────────────────────
const PgSessionStore = connectPgSimple(session);

const app: Express = express();

// Trust the first hop of the TLS-terminating reverse proxy (Replit's edge).
// Required so express-session emits secure cookies when NODE_ENV=production.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      }
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware — HttpOnly cookie, stored in PostgreSQL
app.use(
  session({
    name: "sid",
    secret: SESSION_SECRET,
    store: new PgSessionStore({
      conString: process.env["DATABASE_URL"],
      tableName: "session",
      createTableIfMissing: true,
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    },
  }),
);

app.use("/api", router);

export default app;
