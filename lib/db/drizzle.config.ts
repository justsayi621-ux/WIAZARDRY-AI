import { defineConfig } from "drizzle-kit";

// Use your fresh Neon Connection string as the absolute system-level fallback variable
const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_dj3uFQhfSz4c@ep-frosty-dawn-aqce21pw.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require";

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
    ssl: { rejectUnauthorized: false },
  },
});
