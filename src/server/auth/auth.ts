import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/server/db";
import { user, session, account, verification } from "@/db/schema";

export const allowRegister = process.env.ALLOW_REGISTER !== "0";

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
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
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
