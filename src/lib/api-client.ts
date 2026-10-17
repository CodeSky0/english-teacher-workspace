export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

import { isAbortError } from "./error";

const DEFAULT_TIMEOUT = 30_000;
const LONG_TIMEOUT = 120_000;

function withTimeout(ms: number): { signal: AbortSignal | undefined; clear: () => void } {
  if (typeof AbortController === "undefined") return { signal: undefined, clear: () => {} };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

async function request<T>(path: string, options?: RequestInit, timeout = DEFAULT_TIMEOUT): Promise<T> {
  const { signal, clear } = withTimeout(timeout);
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      signal,
    });
  } catch (e: unknown) {
    clear();
    if (isAbortError(e)) throw new ApiError("TIMEOUT", "请求超时，请稍后重试", 408);
    throw new ApiError("NETWORK", "网络错误，请检查连接", 0);
  }
  clear();
  const json = await res.json().catch(() => ({ error: { code: "PARSE_ERROR", message: "解析响应失败" } }));
  if (!res.ok) {
    throw new ApiError(json.error?.code || "UNKNOWN", json.error?.message || "请求失败", res.status);
  }
  return json as T;
}

async function assertOk(res: Response, fallback: string) {
  if (res.ok) return;
  const json = await res.json().catch(() => null);
  throw new ApiError(
    json?.error?.code || "UNKNOWN",
    json?.error?.message || fallback,
    res.status
  );
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),

  /** multipart 上传（Excel 解析），不设置 Content-Type，交给浏览器自动带 boundary */
  async upload<T>(path: string, file: File, fields?: Record<string, string>): Promise<T> {
    const form = new FormData();
    form.append("file", file);
    for (const [key, value] of Object.entries(fields ?? {})) form.append(key, value);
    const { signal, clear } = withTimeout(LONG_TIMEOUT);
    let res: Response;
    try {
      res = await fetch(`/api${path}`, { method: "POST", body: form, signal });
    } catch (e: unknown) {
      clear();
      if (isAbortError(e)) throw new ApiError("TIMEOUT", "上传超时，请减小文件后重试", 408);
      throw new ApiError("NETWORK", "网络错误，请检查连接", 0);
    }
    clear();
    await assertOk(res, "上传失败");
    return (await res.json()) as T;
  },

  /** 下载二进制文件（Excel 导出），返回实际保存的文件名 */
  async downloadFile(path: string, fallbackName: string): Promise<string> {
    const { signal, clear } = withTimeout(LONG_TIMEOUT);
    let res: Response;
    try {
      res = await fetch(`/api${path}`, { signal });
    } catch (e: unknown) {
      clear();
      if (isAbortError(e)) throw new ApiError("TIMEOUT", "导出超时，请稍后重试", 408);
      throw new ApiError("NETWORK", "网络错误，请检查连接", 0);
    }
    clear();
    await assertOk(res, "导出失败");
    const blob = await res.blob();
    const filename = filenameFromDisposition(res.headers.get("Content-Disposition")) || fallbackName;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return filename;
  },
};

export function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      return star[1];
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1] ?? null;
}
