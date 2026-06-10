import { Request } from "express";

export function getUserId(req: Request): number | null {
  const header = req.headers["x-user-id"];
  if (!header) return null;
  const id = parseInt(Array.isArray(header) ? header[0] : header, 10);
  return isNaN(id) ? null : id;
}

export function requireAuth(req: Request): number {
  const id = getUserId(req);
  if (!id) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  return id;
}

export function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "wai_";
  for (let i = 0; i < 40; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

export function generateWebhookSecret(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let secret = "whsec_";
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}
