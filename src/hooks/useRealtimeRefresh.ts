/**
 * Academic mutations refresh their own queries. A catch-all Realtime channel
 * is deliberately avoided because only chat/notification tables are published.
 * Those features keep narrow, user-filtered subscriptions in their own hooks.
 */
export function useRealtimeRefresh(
  _refresh: () => void | Promise<void>,
  _tables: string[],
) {
  // Compatibility hook: intentionally no global postgres_changes subscription.
}
