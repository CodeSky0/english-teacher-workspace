/** 从 unknown 错误中安全提取 message 字符串 */
export function getErrorMessage(e: unknown, fallback = "操作失败"): string {
  if (e instanceof Error) return e.message || fallback;
  if (typeof e === "object" && e !== null && "message" in e) {
    const m = (e as { message: unknown }).message;
    if (typeof m === "string") return m || fallback;
  }
  if (typeof e === "string") return e || fallback;
  return fallback;
}

/** 判断 unknown 错误是否为 AbortError（fetch 超时） */
export function isAbortError(e: unknown): boolean {
  if (typeof e === "object" && e !== null && "name" in e) {
    return (e as { name: unknown }).name === "AbortError";
  }
  return false;
}
