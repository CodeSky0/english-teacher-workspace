import { redis } from "./redis";

/**
 * Cache-aside：先读 Redis，命中则反序列化返回；未命中调 loader 查库并回填。
 * Redis 不可用时透明降级为直接查库。
 */
export async function cached<T>(
  key: string,
  ttlSec: number,
  loader: () => Promise<T>,
): Promise<T> {
  if (redis) {
    try {
      const hit = await redis.get<string>(key);
      if (hit != null) return JSON.parse(hit) as T;
    } catch {
      // 缓存读失败，降级到 loader
    }
  }
  const value = await loader();
  if (redis && value != null) {
    try {
      await redis.set(key, JSON.stringify(value), { ex: ttlSec });
    } catch {
      // 回填失败忽略
    }
  }
  return value;
}

/** 失效一个或多个缓存键 */
export async function bust(...keys: string[]): Promise<void> {
  if (!redis || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch {
    // 忽略
  }
}

/** 缓存键生成器 */
export const ck = {
  overview: (uid: string) => `ov:${uid}`,
  classes: (uid: string) => `cl:${uid}`,
  students: (uid: string) => `st:${uid}`,
  vocabUnits: (uid: string) => `vu:${uid}`,
  vocabWords: (uid: string) => `vw:${uid}`,
  dictLists: (uid: string) => `dl:${uid}`,
  dictWords: (uid: string) => `dw:${uid}`,
  dictResults: (uid: string, listId: string) => `dr:${uid}:${listId}`,
  schedulePeriods: (uid: string) => `tp:${uid}`,
  scheduleCells: (uid: string) => `tc:${uid}`,
  profile: (uid: string) => `pf:${uid}`,
};

/** 写操作后失效 overview + 额外指定的列表键 */
export async function bustUser(uid: string, ...extra: string[]): Promise<void> {
  await bust(ck.overview(uid), ...extra);
}
