/**
 * Pure merge planning for backup restore.
 * - lww:        newest `updatedAt` wins (tombstones via `deletedAt` travel with the row)
 * - union:      append-only rows (logs, sessions): add what is missing
 * - insertOnly: immutable rows (chapters, blobs, caches): add what is missing
 */
export type MergePolicy = 'lww' | 'union' | 'insertOnly';

export interface MergePlan<T> {
  put: T[];
  added: number;
  updated: number;
  unchanged: number;
}

export function updatedAtOf(row: unknown): number {
  const value = (row as { updatedAt?: unknown } | null)?.updatedAt;
  return typeof value === 'number' ? value : 0;
}

export function planMerge<T>(
  localByKey: ReadonlyMap<string, T>,
  incoming: readonly T[],
  keyOf: (row: T) => string,
  policy: MergePolicy,
): MergePlan<T> {
  // Collapse duplicates inside the backup itself (newest wins).
  const latest = new Map<string, T>();
  for (const row of incoming) {
    const key = keyOf(row);
    const seen = latest.get(key);
    if (!seen || updatedAtOf(row) > updatedAtOf(seen)) latest.set(key, row);
  }

  const plan: MergePlan<T> = { put: [], added: 0, updated: 0, unchanged: 0 };
  for (const [key, row] of latest) {
    const local = localByKey.get(key);
    if (local === undefined) {
      plan.put.push(row);
      plan.added++;
    } else if (policy === 'lww' && updatedAtOf(row) > updatedAtOf(local)) {
      plan.put.push(row);
      plan.updated++;
    } else {
      plan.unchanged++;
    }
  }
  return plan;
}
