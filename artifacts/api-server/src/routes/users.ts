import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, subscriptionsTable, settingsTable, notificationsTable } from "@workspace/db";
import { getUserId } from "../lib/auth";
import crypto from "crypto";

const router: IRouter = Router();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  if (!stored.includes(":")) return stored === password;
  const [salt, hash] = stored.split(":");
  const verify = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return verify === hash;
}

// GET /users/me
router.get("/users/me", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || user.deletedAt) { res.status(404).json({ error: "User not found" }); return; }
  const { password: _p, twoFactorSecret: _t, sessionToken: _s, ...safe } = user;
  res.json(safe);
});

// PATCH /users/me — update profile including avatar URL
router.patch("/users/me", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { displayName, avatarUrl, username } = req.body;

  // Username uniqueness check if changing
  if (username) {
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      res.status(400).json({ error: "Username must be 3-20 characters, letters/numbers/underscore only" }); return;
    }
    const [existing] = await db.select({ id: usersTable.id })
      .from(usersTable).where(eq(usersTable.username, username.toLowerCase()));
    if (existing && existing.id !== userId) {
      res.status(409).json({ error: "Username already taken" }); return;
    }
  }

  const [user] = await db.update(usersTable).set({
    ...(displayName !== undefined ? { displayName } : {}),
    ...(avatarUrl !== undefined ? { avatarUrl } : {}),
    ...(username ? { username: username.toLowerCase() } : {}),
  }).where(eq(usersTable.id, userId)).returning();

  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const { password: _p, twoFactorSecret: _t, sessionToken: _s, ...safe } = user;
  res.json(safe);
});

// POST /users/register (kept for backward compat — proxies to auth/register logic)
router.post("/users/register", async (req, res): Promise<void> => {
  const { email, username, password, displayName } = req.body;
  if (!email || !username || !password) { res.status(400).json({ error: "Missing required fields" }); return; }
  if (password.length < 8) { res.status(400).json({ error: "Password must be at least 8 characters" }); return; }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    res.status(400).json({ error: "Username must be 3-20 characters, letters/numbers/underscore only" }); return;
  }

  const normalizedEmail = email.toLowerCase().trim();

  const [existingEmail] = await db.select({ id: usersTable.id, googleId: usersTable.googleId })
    .from(usersTable).where(eq(usersTable.email, normalizedEmail));
  if (existingEmail) {
    if (existingEmail.googleId) {
      res.status(409).json({ error: "This email is linked to a Google account. Use Google Sign-In.", hint: "use_google" }); return;
    }
    res.status(409).json({ error: "Email already registered. Please sign in.", hint: "login" }); return;
  }

  const [existingUser] = await db.select({ id: usersTable.id })
    .from(usersTable).where(eq(usersTable.username, username.toLowerCase()));
  if (existingUser) { res.status(409).json({ error: "Username already taken. Please choose another." }); return; }

  const passwordHash = hashPassword(password);
  const [user] = await db.insert(usersTable).values({
    email: normalizedEmail, username: username.toLowerCase(),
    password: passwordHash, displayName: displayName || username,
    authMethod: "email",
  }).returning();

  await db.insert(subscriptionsTable).values({ userId: user.id, planId: "free" });
  await db.insert(settingsTable).values({ userId: user.id });
  await db.insert(notificationsTable).values({
    userId: user.id, type: "greeting", priority: "medium",
    title: "Welcome to Wizardry AI! 🎉",
    message: `Welcome, ${displayName || username}! Your account is ready.`,
  });

  const { password: _p, twoFactorSecret: _t, sessionToken: _s, ...safe } = user;
  res.status(201).json({
    user: safe, userId: user.id,
    displayName: user.displayName || user.username,
    message: `Account created! Welcome to Wizardry AI, ${displayName || username}!`,
  });
});

// POST /users/login (kept for backward compat)
router.post("/users/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ error: "Missing credentials" }); return; }

  const [user] = await db.select().from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()));
  if (!user || user.deletedAt) {
    res.status(404).json({ error: "No account found with this email.", hint: "register" }); return;
  }
  if (user.authMethod === "google" && !user.password) {
    res.status(401).json({ error: "This account uses Google Sign-In. Use the Google button.", hint: "use_google" }); return;
  }
  if (!user.password || !verifyPassword(password, user.password)) {
    res.status(401).json({ error: "Incorrect password. Please try again." }); return;
  }

  const { password: _p, twoFactorSecret: _t, sessionToken: _s, ...safe } = user;
  res.json({
    user: safe, userId: user.id,
    needsPasswordSetup: user.needsPasswordSetup,
    twoFactorEnabled: user.twoFactorEnabled,
    displayName: user.displayName || user.username,
    message: `Welcome back, ${user.displayName || user.username}!`,
  });
});

export default router;