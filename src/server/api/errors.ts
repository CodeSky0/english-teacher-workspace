import { Context } from "hono";

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export function apiError(code: string, message: string, details?: unknown) {
  return { error: { code, message, details } } as const;
}

export function unauthorized(c: Context) {
  return c.json(apiError("UNAUTHORIZED", "未登录"), 401);
}

export function forbidden(c: Context) {
  return c.json(apiError("FORBIDDEN", "无权访问"), 403);
}

export function notFound(c: Context, msg = "记录不存在") {
  return c.json(apiError("NOT_FOUND", msg), 404);
}

export function badRequest(c: Context, msg = "请求参数不合法") {
  return c.json(apiError("BAD_REQUEST", msg), 400);
}

export function conflict(c: Context, msg = "数据冲突") {
  return c.json(apiError("CONFLICT", msg), 409);
}

export function unprocessable(c: Context, msg: string, details?: unknown) {
  return c.json(apiError("UNPROCESSABLE", msg, details), 422);
}

export function tooManyRequests(c: Context) {
  return c.json(apiError("RATE_LIMIT", "请求过于频繁，请稍后再试"), 429);
}

export function serverError(c: Context, msg = "服务器异常") {
  return c.json(apiError("SERVER_ERROR", msg), 500);
}
