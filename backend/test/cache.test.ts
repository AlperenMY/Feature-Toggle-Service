import { getCached, setCached, invalidate } from "../src/utils/cache";

type FakeRedis = {
  store: Map<string, string>;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, mode: string, ttlSeconds: number) => Promise<"OK">;
  del: (key: string) => Promise<number>;
};

function createFakeRedis(): FakeRedis {
  const store = new Map<string, string>();
  return {
    store,
    get: async (key) => store.get(key) ?? null,
    set: async (key, value) => {
      store.set(key, value);
      return "OK";
    },
    del: async (key) => (store.delete(key) ? 1 : 0),
  };
}

describe("cache utils", () => {
  it("setCached stores JSON and getCached parses it", async () => {
    const redis = createFakeRedis();
    await setCached(redis as any, "k1", { x: 1 }, 60);

    const val = await getCached<{ x: number }>(redis as any, "k1");
    expect(val).toEqual({ x: 1 });
  });

  it("invalidate removes cached value", async () => {
    const redis = createFakeRedis();
    await setCached(redis as any, "k2", { y: "z" }, 60);
    await invalidate(redis as any, "k2");

    const val = await getCached(redis as any, "k2");
    expect(val).toBeNull();
  });
});
