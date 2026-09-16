import dotenv from "dotenv";

dotenv.config();

/**
 * JWT secrets.
 *
 * These used to fall back to literals that are committed in `.env.example` and
 * repeated inline in two files, so anyone with the repo could mint a valid admin
 * token for a deployment that hadn't set the variables. There is no fallback now:
 * outside development the process refuses to start without real secrets.
 */
const isProduction = process.env.NODE_ENV === "production";

function requireSecret(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value) return value;

  if (isProduction) {
    throw new Error(
      `${name} is not set. Refusing to start in production with a default signing secret.`
    );
  }

  console.warn(`[secrets] ${name} is not set — using an insecure development-only value.`);
  return devFallback;
}

export const JWT_SECRET = requireSecret("JWT_SECRET", "dev_only_access_secret_do_not_deploy");
export const JWT_REFRESH_SECRET = requireSecret(
  "JWT_REFRESH_SECRET",
  "dev_only_refresh_secret_do_not_deploy"
);

export const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_TTL || "1d";
export const REFRESH_TOKEN_TTL = process.env.JWT_REFRESH_TTL || "7d";
