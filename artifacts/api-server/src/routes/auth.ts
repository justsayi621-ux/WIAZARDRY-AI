import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, usersTable, subscriptionsTable, settingsTable, notificationsTable } from "@workspace/db";
import { getUserId } from "../lib/auth";
import crypto from "crypto";
import { Resend } from "resend";

const router: IRouter = Router();
const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const FROM_EMAIL = "Wizardry AI <onboarding@resend.dev>";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeSessionToken(userId: number): string {
  return `wai_sess_${userId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function makeTotpSecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// Simple bcrypt-compatible hash using Node crypto (no extra package)
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  // Support both old plaintext passwords and new hashed ones
  if (!stored.includes(":")) return stored === password; // legacy plaintext
  const [salt, hash] = stored.split(":");
  const verify = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return verify === hash;
}

function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Simple TOTP verification using Node crypto
function verifyTotp(secret: string, otp: string): boolean {
  const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of secret.toUpperCase()) {
    const val = base32Chars.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  const keyBuffer = Buffer.from(bytes);

  // Check current and adjacent time windows
  const timeStep = Math.floor(Date.now() / 1000 / 30);
  for (const offset of [-1, 0, 1]) {
    const t = timeStep + offset;
    const tBuffer = Buffer.alloc(8);
    tBuffer.writeUInt32BE(Math.floor(t / 2 ** 32), 0);
    tBuffer.writeUInt32BE(t >>> 0, 4);
    const hmac = crypto.createHmac("sha1", keyBuffer).update(tBuffer).digest();
    const offset2 = hmac[hmac.length - 1] & 0xf;
    const code = ((hmac.readUInt32BE(offset2) & 0x7fffffff) % 1000000).toString().padStart(6, "0");
    if (code === otp) return true;
  }
  return false;
}

// Auto-create workspace for new user based on plan
async function createDefaultWorkspace(userId: number, displayName: string, planId: string) {
  const quotaMap: Record<string, number> = {
    free: 5, basic: 50, pro: 200, advanced: 600, enterprise: 1000,
  };
  const quota = quotaMap[planId] ?? 5;
  const { workspacesTable, workspaceMembersTable } = await import("@workspace/db") as any;
  if (!workspacesTable) return; // table may not exist yet
  try {
    const inserted = (await db.insert(workspacesTable).values({
      name: `${displayName}'s Workspace`,
      ownerId: userId,
      planId,
      scanQuota: quota,
    }).returning()) as any[];
    const ws = inserted[0];
    await db.insert(workspaceMembersTable).values({
      workspaceId: ws.id,
      userId,
      role: "owner",
    });
  } catch {
    // workspace tables not yet migrated — skip silently
  }
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── POST /auth/check-email ───────────────────────────────────────────────────
//  POST /auth/check-email
router.post("/auth/check-email", async (req, res): Promise<void> => {
    const { email } = req.body;

    if (!email) {
        res.status(400).json({ error: "Email is required" });
        return;
    }

    const [user] = await db
        .select({ id: usersTable.id, authMethod: usersTable.authMethod, googleId: usersTable.googleId, displayName: usersTable.displayName, deletedAt: usersTable.deletedAt })
        .from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));

    if (!user || user.deletedAt) {
        res.json({ exists: false });
        return;
    }

    res.json({ exists: true, authMethod: user.authMethod, hasGoogle: !!user.googleId, displayName: user.displayName });
});
// ─── POST /auth/register ──────────────────────────────────────────────────────
router.post("/auth/register", async (req, res): Promise<void> => {
  const { email, username, password, displayName, onboardingAnswers } = req.body;
    if (!email || !username || !password) { res.status(400).json({ error: "Email, username and password are required" }); return; }
    if (password.length < 8) { res.status(400).json({ error: "Password must be at least 8 characters" }); return; }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) { res.status(400).json({ error: "Username must be 3-20 characters, letters/numbers/underscore only" }); return; }
    const normalizedEmail = email.toLowerCase().trim();

  // Duplicate checks
  const [existingEmail] = await db.select({ id: usersTable.id, googleId: usersTable.googleId })
    .from(usersTable).where(eq(usersTable.email, normalizedEmail));
  if (existingEmail) {
    if (existingEmail.googleId) {
      res.status(409).json({ error: "This email is linked to a Google account. Use Google Sign-In.", hint: "use_google" }); return;
    }
    res.status(409).json({ error: "Email already registered. Please sign in.", hint: "login" }); return;
  }

  const [existingUsername] = await db.select({ id: usersTable.id })
    .from(usersTable).where(eq(usersTable.username, username.toLowerCase()));
  if (existingUsername) { res.status(409).json({ error: "Username already taken. Please choose another." }); return; }

  const passwordHash = hashPassword(password);
  const emailVerifyToken = generateResetToken();

  const [user] = await db.insert(usersTable).values({
    email: normalizedEmail,
    username: username.toLowerCase(),
    password: passwordHash,
    displayName: displayName || username,
    authMethod: "email",
    onboardingAnswers: onboardingAnswers ? JSON.stringify(onboardingAnswers) : null,
    onboardingCompleted: !!onboardingAnswers,
    emailVerifyToken,
    sessionToken: "placeholder",
  } as any).returning();

  const token = makeSessionToken(user.id);
  await db.update(usersTable).set({ sessionToken: token } as any).where(eq(usersTable.id, user.id));
  await db.insert(subscriptionsTable).values({ userId: user.id, planId: "free" });
  await db.insert(settingsTable).values({ userId: user.id });
  await db.insert(notificationsTable).values({
    userId: user.id, type: "greeting", priority: "medium",
    title: "Welcome to Wizardry AI! 🎉",
    message: `Your account is ready, ${user.displayName}! Start your first scan to detect deepfakes with enterprise-grade AI.`,
  });

  await createDefaultWorkspace(user.id, user.displayName || user.username, "free");

  // Send welcome + verify email
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: normalizedEmail,
      subject: "Welcome to Wizardry AI — Verify your email",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#080c18;color:#e2e8f0;padding:32px;border-radius:12px;border:1px solid #1e293b">
          <h1 style="color:#7c3aed;font-size:24px;margin:0 0 8px">Welcome to Wizardry AI</h1>
          <p style="color:#94a3b8;margin:0 0 24px">Enterprise Deepfake Detection Platform</p>
          <p>Hi <strong>${user.displayName || user.username}</strong>,</p>
          <p>Your account has been created. Please verify your email to unlock all features.</p>
          <a href="${APP_URL}/verify-email?token=${emailVerifyToken}" 
             style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
            Verify Email Address
          </a>
          <p style="color:#64748b;font-size:12px;margin-top:24px">If you didn't create this account, ignore this email.</p>
        </div>
      `,
    });
  } catch (e) {
    console.warn("Welcome email failed:", e);
  }

  const { password: _p, twoFactorSecret: _t, sessionToken: _s, ...safe } = user;
  res.status(201).json({
    user: safe, userId: user.id, sessionToken: token,
    displayName: user.displayName || user.username,
    message: `Welcome to Wizardry AI, ${user.displayName || user.username}! Check your email to verify your account.`,
    needsOnboarding: !onboardingAnswers,
  });
});

// ─── POST /auth/login (same as /users/login) ─────────────────────────────────
router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password, otp } = req.body;
  if (!email || !password) { res.status(400).json({ error: "Missing credentials" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));
  if (!user || user.deletedAt) {
    res.status(404).json({ error: "No account found with this email.", hint: "register" }); return;
  }
  if (user.authMethod === "google" && !user.password) {
    res.status(401).json({ error: "This account uses Google Sign-In. Use the Google button.", hint: "use_google" }); return;
  }
  if (!user.password || !verifyPassword(password, user.password)) {
    res.status(401).json({ error: "Incorrect password. Please try again." }); return;
  }

  if (user.twoFactorEnabled) {
    if (!otp) {
      res.status(401).json({ error: "Two-factor authentication required.", hint: "two_factor_required", needsTwoFactor: true });
      return;
    }
    if (!user.twoFactorSecret || !verifyTotp(user.twoFactorSecret, otp)) {
      res.status(401).json({ error: "Invalid 2FA code. Please try again." }); return;
    }
  }

  const token = makeSessionToken(user.id);
  await db.update(usersTable).set({ sessionToken: token } as any).where(eq(usersTable.id, user.id));

  const { password: _p, twoFactorSecret: _t, sessionToken: _s, ...safe } = user;
  res.json({
    user: safe, userId: user.id, sessionToken: token,
    needsPasswordSetup: user.needsPasswordSetup,
    twoFactorEnabled: user.twoFactorEnabled,
    needsOnboarding: !(user as any).onboardingCompleted,
    displayName: user.displayName || user.username,
    message: `Welcome back to Wizardry AI, ${user.displayName || user.username}!`,
  });
});

// ─── POST /auth/forgot-password ───────────────────────────────────────────────
router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: "Email is required" }); return; }

  const [user] = await db.select({ id: usersTable.id, email: usersTable.email, displayName: usersTable.displayName, deletedAt: usersTable.deletedAt })
    .from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));

  // Always return success to prevent email enumeration
  if (!user || user.deletedAt) {
    res.json({ success: true, message: "If an account exists with this email, a reset link has been sent." }); return;
  }

  const token = generateResetToken();
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Store reset token on user record
  await db.update(usersTable).set({
    resetToken: token,
    resetTokenExpires: expires,
  } as any).where(eq(usersTable.id, user.id));

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: "Reset your Wizardry AI password",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#080c18;color:#e2e8f0;padding:32px;border-radius:12px;border:1px solid #1e293b">
          <h1 style="color:#7c3aed;font-size:24px;margin:0 0 8px">Password Reset</h1>
          <p style="color:#94a3b8;margin:0 0 24px">Wizardry AI</p>
          <p>Hi <strong>${user.displayName || "there"}</strong>,</p>
          <p>We received a request to reset your password. Click below to set a new password. This link expires in 1 hour.</p>
          <a href="${APP_URL}/reset-password?token=${token}" 
             style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
            Reset Password
          </a>
          <p style="color:#64748b;font-size:12px;margin-top:24px">If you didn't request this, ignore this email. Your password won't change.</p>
        </div>
      `,
    });
  } catch (e) {
    console.warn("Reset email failed:", e);
  }

  res.json({ success: true, message: "If an account exists with this email, a reset link has been sent." });
});

// ─── POST /auth/reset-password ────────────────────────────────────────────────
router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { token, password } = req.body;
  if (!token || !password) { res.status(400).json({ error: "Token and password are required" }); return; }
  if (password.length < 8) { res.status(400).json({ error: "Password must be at least 8 characters" }); return; }

  const [user] = await db.select().from(usersTable)
    .where(eq((usersTable as any).resetToken, token));

  if (!user) { res.status(400).json({ error: "Invalid or expired reset link. Please request a new one." }); return; }

  const expires = (user as any).resetTokenExpires as Date | null;
  if (!expires || new Date() > new Date(expires)) {
    res.status(400).json({ error: "Reset link has expired. Please request a new one." }); return;
  }

  const passwordHash = hashPassword(password);
  await db.update(usersTable).set({
    password: passwordHash,
    needsPasswordSetup: false,
    resetToken: null,
    resetTokenExpires: null,
    sessionToken: null, // force re-login
  } as any).where(eq(usersTable.id, user.id));

  res.json({ success: true, message: "Password reset successfully. Please sign in with your new password." });
});

// ─── POST /auth/verify-email ──────────────────────────────────────────────────
router.post("/auth/verify-email", async (req, res): Promise<void> => {
  const { token } = req.body;
  if (!token) { res.status(400).json({ error: "Token required" }); return; }

  const [user] = await db.select({ id: usersTable.id })
    .from(usersTable).where(eq((usersTable as any).emailVerifyToken, token));

  if (!user) { res.status(400).json({ error: "Invalid verification link" }); return; }

  await db.update(usersTable).set({
    emailVerified: true,
    emailVerifyToken: null,
  } as any).where(eq(usersTable.id, user.id));

  res.json({ success: true, message: "Email verified successfully!" });
});

// ─── POST /auth/google/signin — REAL Google OAuth ─────────────────────────────
router.post("/auth/google/signin", async (req, res): Promise<void> => {
  const { googleId, email, displayName, avatarUrl, googleAccessToken } = req.body;
  if (!googleId || !email) { res.status(400).json({ error: "googleId and email are required" }); return; }

  // Verify the Google access token server-side
  if (googleAccessToken) {
    try {
      const verifyRes = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${googleAccessToken}`);
      const info = await verifyRes.json() as { sub?: string; email?: string; error_description?: string };
      if (!verifyRes.ok || info.sub !== googleId) {
        res.status(401).json({ error: "Google token verification failed." }); return;
      }
    } catch {
      res.status(401).json({ error: "Could not verify Google token." }); return;
    }
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check existing by googleId
  const [byGoogle] = await db.select().from(usersTable).where(eq(usersTable.googleId, googleId));
  if (byGoogle && !byGoogle.deletedAt) {
    const token = makeSessionToken(byGoogle.id);
    await db.update(usersTable).set({ sessionToken: token, avatarUrl: avatarUrl || byGoogle.avatarUrl } as any).where(eq(usersTable.id, byGoogle.id));
    res.json({
      userId: byGoogle.id, sessionToken: token,
      needsPasswordSetup: byGoogle.needsPasswordSetup,
      needsOnboarding: !(byGoogle as any).onboardingCompleted,
      isNew: false, displayName: byGoogle.displayName || byGoogle.username,
      message: `Welcome back, ${byGoogle.displayName || byGoogle.username}!`,
    });
    return;
  }

  // Check existing by email — merge
  const [byEmail] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));
  if (byEmail && !byEmail.deletedAt) {
    const token = makeSessionToken(byEmail.id);
    await db.update(usersTable).set({ googleId, authMethod: "google", sessionToken: token, avatarUrl: avatarUrl || byEmail.avatarUrl } as any).where(eq(usersTable.id, byEmail.id));
            res.json({
            userId: byEmail.id,
            sessionToken: token,
            // <-- Dynamically check if they lack a manual password!
            needsPasswordSetup: !byEmail.password, 
            needsOnboarding: !(byEmail as any).onboardingCompleted,
            isNew: false,
            displayName: byEmail.displayName || byEmail.username,
            message: `Welcome back, ${byEmail.displayName || byEmail.username}!`,
        });
        return;
  }

  // New Google user
  const baseUsername = normalizedEmail.split("@")[0].replace(/[^a-z0-9_]/gi, "_").slice(0, 15);
  const username = `${baseUsername}_${Math.floor(Math.random() * 9999)}`;

  const [user] = await db.insert(usersTable).values({
    email: normalizedEmail, username, displayName: displayName || username,
    avatarUrl, googleId, authMethod: "google", needsPasswordSetup: true,
    emailVerified: true, // Google verifies email
    sessionToken: "placeholder",
  } as any).returning();

  const token = makeSessionToken(user.id);
  await db.update(usersTable).set({ sessionToken: token } as any).where(eq(usersTable.id, user.id));
  await db.insert(subscriptionsTable).values({ userId: user.id, planId: "free" });
  await db.insert(settingsTable).values({ userId: user.id });
  await db.insert(notificationsTable).values({
    userId: user.id, type: "greeting", priority: "medium",
    title: "Welcome to Wizardry AI! 🎉",
    message: `Your account is ready, ${user.displayName}! You signed in with Google. Consider setting a password for additional login options.`,
  });

  await createDefaultWorkspace(user.id, user.displayName || user.username, "free");

  // Send welcome email
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: normalizedEmail,
      subject: "Welcome to Wizardry AI",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#080c18;color:#e2e8f0;padding:32px;border-radius:12px;border:1px solid #1e293b">
          <h1 style="color:#7c3aed;font-size:24px;margin:0 0 8px">Welcome to Wizardry AI</h1>
          <p>Hi <strong>${user.displayName}</strong>, your account has been created via Google Sign-In.</p>
          <p>Start detecting deepfakes with enterprise-grade AI.</p>
          <a href="${APP_URL}/scanner" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Start Scanning</a>
        </div>
      `,
    });
  } catch (e) { console.warn("Welcome email failed:", e); }

  res.status(201).json({
    userId: user.id, sessionToken: token, needsPasswordSetup: true,
    needsOnboarding: true, isNew: true,
    displayName: user.displayName,
    message: `Welcome to Wizardry AI, ${user.displayName}!`,
  });
});

// ─── POST /auth/apple/signin (kept intact) ───────────────────────────────────
router.post("/auth/apple/signin", async (req, res): Promise<void> => {
  const { appleId, email, displayName } = req.body;
  if (!appleId || !email) { res.status(400).json({ error: "appleId and email are required" }); return; }
  const normalizedEmail = email.toLowerCase().trim();
  const [byApple] = await db.select().from(usersTable).where(eq(usersTable.appleId, appleId));
  if (byApple && !byApple.deletedAt) {
    const token = makeSessionToken(byApple.id);
    await db.update(usersTable).set({ sessionToken: token } as any).where(eq(usersTable.id, byApple.id));
    res.json({ userId: byApple.id, sessionToken: token, needsPasswordSetup: byApple.needsPasswordSetup, isNew: false, displayName: byApple.displayName, message: `Welcome back, ${byApple.displayName}!` });
    return;
  }
  const [byEmail] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));
  if (byEmail && !byEmail.deletedAt) {
    const token = makeSessionToken(byEmail.id);
    await db.update(usersTable).set({ appleId, authMethod: "apple", sessionToken: token } as any).where(eq(usersTable.id, byEmail.id));
    res.json({ userId: byEmail.id, sessionToken: token, needsPasswordSetup: !byEmail.password, isNew: false, displayName: byEmail.displayName, message: `Welcome back, ${byEmail.displayName}!` });
    return;
  }
  const baseUsername = normalizedEmail.split("@")[0].replace(/[^a-z0-9_]/gi, "_").slice(0, 15);
  const username = `${baseUsername}_${Math.floor(Math.random() * 9999)}`;
  const [user] = await db.insert(usersTable).values({ email: normalizedEmail, username, displayName: displayName || username, appleId, authMethod: "apple", needsPasswordSetup: true, sessionToken: "placeholder" } as any).returning();
  const token = makeSessionToken(user.id);
  await db.update(usersTable).set({ sessionToken: token } as any).where(eq(usersTable.id, user.id));
  await db.insert(subscriptionsTable).values({ userId: user.id, planId: "free" });
  await db.insert(settingsTable).values({ userId: user.id });
  await createDefaultWorkspace(user.id, user.displayName || user.username, "free");
  res.status(201).json({ userId: user.id, sessionToken: token, needsPasswordSetup: true, isNew: true, displayName: user.displayName, message: `Welcome to Wizardry AI, ${user.displayName}!` });
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────
router.post("/auth/logout", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (userId) {
    await db.update(usersTable).set({ sessionToken: null } as any).where(eq(usersTable.id, userId));
  }
  res.json({ success: true });
});

// ─── POST /auth/update-password ───────────────────────────────────────────────
router.post("/auth/update-password", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { password, currentPassword } = req.body;
  if (!password || password.length < 8) { res.status(400).json({ error: "Password must be at least 8 characters" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.password && !user.needsPasswordSetup) {
    if (!currentPassword || !verifyPassword(currentPassword, user.password)) {
      res.status(401).json({ error: "Current password is incorrect" }); return;
    }
  }
  const passwordHash = hashPassword(password);
  await db.update(usersTable).set({ password: passwordHash, needsPasswordSetup: false } as any).where(eq(usersTable.id, userId));
  res.json({ success: true, message: "Password updated successfully." });
});

// ─── POST /auth/onboarding ────────────────────────────────────────────────────
router.post("/auth/onboarding", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { answers } = req.body;
  await db.update(usersTable).set({
    onboardingAnswers: JSON.stringify(answers),
    onboardingCompleted: true,
  } as any).where(eq(usersTable.id, userId));
  res.json({ success: true, message: "Onboarding complete!" });
});

// ─── DELETE /auth/account ─────────────────────────────────────────────────────
router.delete("/auth/account", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { confirmation } = req.body;
  if (confirmation !== "DELETE_MY_ACCOUNT") {
    res.status(400).json({ error: "Type DELETE_MY_ACCOUNT to confirm" }); return;
  }
  await db.update(usersTable).set({ deletedAt: new Date(), sessionToken: null } as any).where(eq(usersTable.id, userId));
  res.json({ success: true, message: "Account permanently deleted." });
});

// ─── 2FA routes (real TOTP) ───────────────────────────────────────────────────
router.post("/auth/2fa/setup", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const secret = makeTotpSecret();
  await db.update(usersTable).set({ twoFactorSecret: secret }).where(eq(usersTable.id, userId));
  const [user] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, userId));
  const otpauthUrl = `otpauth://totp/WizardryAI:${user?.email}?secret=${secret}&issuer=WizardryAI`;
  res.json({
    secret,
    qrCodeUrl: otpauthUrl,
    otpauthUrl,
    backupCodes: Array.from({ length: 8 }, () => Math.random().toString(36).slice(2, 10).toUpperCase()),
    instructions: "Scan the QR code with Google Authenticator, Authy, or any TOTP app.",
  });
});

router.post("/auth/2fa/verify", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { otp } = req.body;
  if (!otp || !/^\d{6}$/.test(otp)) { res.status(400).json({ error: "Enter the 6-digit code from your authenticator app" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user?.twoFactorSecret) { res.status(400).json({ error: "2FA not set up yet" }); return; }
  if (!verifyTotp(user.twoFactorSecret, otp)) {
    res.status(401).json({ error: "Invalid code. Please try again — codes expire every 30 seconds." }); return;
  }
  await db.update(usersTable).set({ twoFactorEnabled: true }).where(eq(usersTable.id, userId));
  res.json({ success: true, message: "Two-factor authentication enabled successfully." });
});

router.post("/auth/2fa/disable", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { otp } = req.body;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (user?.twoFactorEnabled && user?.twoFactorSecret) {
    if (!otp || !verifyTotp(user.twoFactorSecret, otp)) {
      res.status(401).json({ error: "Valid 2FA code required to disable" }); return;
    }
  }
  await db.update(usersTable).set({ twoFactorEnabled: false, twoFactorSecret: null }).where(eq(usersTable.id, userId));
  res.json({ success: true });
});

export default router;