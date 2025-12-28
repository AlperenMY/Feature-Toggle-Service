import axios, { type AxiosRequestConfig } from "axios";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

const client = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export async function api<T>(path: string, opts: AxiosRequestConfig = {}): Promise<T> {
  const { body, ...rest } = opts as any;
  const data = body ?? opts.data;

  try {
    const res = await client.request<T>({
      url: path,
      data,
      ...rest,
    });
    return res.data;
  } catch (err: any) {
    if (axios.isAxiosError(err) && err.response) {
      const status = err.response.status;
      const payload = err.response.data;
      const message =
        typeof payload === "string"
          ? payload
          : payload?.message || payload?.error || `HTTP ${status}`;
      throw new Error(message);
    }
    throw err;
  }
}
