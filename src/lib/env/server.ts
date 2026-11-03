import "server-only";

/** Server-only env access. Fails loudly instead of silently using fake values. */
export function requireServerEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

/** Mock auth is allowed only outside production. */
export function isAuthMockEnabled(): boolean {
  return process.env.AUTH_MOCK_MODE === "true" && process.env.NODE_ENV !== "production";
}
