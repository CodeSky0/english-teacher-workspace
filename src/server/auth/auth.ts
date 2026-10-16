import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/server/db";
import { user, session, account, verification } from "@/db/schema";
import { redis } from "@/server/redis";

export const allowRegister = process.env.ALLOW_REGISTER !== "0";

function createSecondaryStorage(r: NonNullable<typeof redis>) {
  return {
    get: (key: string) => r.get(key),
    getAndDelete: async (key: string) => {
      const val = await r.get<string>(key);
      if (val != null) await r.del(key);
      return val;
    },
    increment: async (key: string, ttl: number) => {
      const n = await r.incr(key);
      if (n === 1) await r.expire(key, ttl);
      return n;
    },
    set: (key: string, value: string, ttl?: number) => r.set(key, value, ttl ? { ex: ttl } : undefined),
    delete: async (key: string) => {
      await r.del(key);
    },
  };
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },
  disabledPaths: allowRegister ? undefined : ["/sign-up/email"],
  secondaryStorage: redis ? createSecondaryStorage(redis) : undefined,
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    storeSessionInDatabase: true,
  },
  user: {
    additionalFields: {
      displayName: { type: "string", required: false },
      title: { type: "string", required: false },
      timezone: { type: "string", required: false, defaultValue: "Asia/Shanghai" },
      defaultClassId: { type: "string", required: false },
      sampleInitialized: { type: "boolean", required: false, defaultValue: false },
    },
  },
});
