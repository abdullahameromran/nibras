// Coalesce identical requests that start during the same render/navigation.
// Results are not retained after completion, so mutations never receive stale
// data and explicit refreshes always reach Supabase.
const inFlightRequests = new Map<string, Promise<unknown>>();

export function coalesceRequest<T>(key: string, load: () => PromiseLike<T>): Promise<T> {
  const existing = inFlightRequests.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const request = Promise.resolve(load()).finally(() => {
    if (inFlightRequests.get(key) === request) inFlightRequests.delete(key);
  });
  inFlightRequests.set(key, request);
  return request;
}
