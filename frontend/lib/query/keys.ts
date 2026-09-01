/** Query keys, in one place so invalidation never has to guess. */
export const queryKeys = {
  session: ["session"] as const,
  search: (query: string) => ["search", query] as const,
};
