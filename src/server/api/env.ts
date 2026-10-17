import type { auth } from "@/server/auth/auth";

/** better-auth 推导的 session 形状：{ session, user } */
type AuthInfer = typeof auth.$Infer;
export type Session = AuthInfer["Session"]["session"];
export type AuthUser = AuthInfer["Session"]["user"];

/** 路由内可访问的 user（仅取业务需要的字段） */
export type RouteUser = { id: string; name: string; email: string };

/** 所有 /api/* 路由共享的 Hono 环境变量 */
export type AppEnv = {
  Variables: {
    user: RouteUser;
    session: Session;
  };
};

/** 仅需要 user.id 的路由使用的精简 env（兼容 AppEnv 的子集） */
export type RouteEnv = {
  Variables: {
    user: { id: string };
    session: Session;
  };
};

/** profile 路由需要 email */
export type ProfileEnv = {
  Variables: {
    user: { id: string; email: string };
    session: Session;
  };
};
