import { Redis } from "@upstash/redis";

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

function createRedis(): Redis | null {
  const restUrl = process.env.KV_REST_API_URL;
  const restToken = process.env.KV_REST_API_TOKEN;

  if (restUrl && restToken) {
    return new Redis({ url: restUrl, token: restToken });
  }

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const url = new URL(redisUrl);
      return new Redis({
        url: `https://${url.hostname}`,
        token: url.password || "",
      });
    } catch {
      return null;
    }
  }

  return null;
}

const redis = globalForRedis.redis ?? createRedis();

if (process.env.NODE_ENV !== "production" && redis) {
  globalForRedis.redis = redis;
}

export { redis };

export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number
): Promise<{ ok: boolean; remaining: number }> {
  if (!redis) return { ok: true, remaining: limit };
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSec);
  }
  return { ok: count <= limit, remaining: Math.max(0, limit - count) };
}
