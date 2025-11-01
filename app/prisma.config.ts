import { defineConfig } from "prisma/config";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.production in production, .env otherwise
// This is necessary because Prisma skips automatic .env loading when prisma.config.ts exists
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env";
loadEnv({ path: resolve(__dirname, envFile) });

export default defineConfig({
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
