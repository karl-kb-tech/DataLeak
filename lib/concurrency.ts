// Runs an async mapper over items with a bounded number of in-flight tasks.
// Used to cap simultaneous username checks (Sherlock platform fan-out) so we
// don't trip platform bot-detection. Results preserve input order.

// `onResult`, when provided, fires as each task settles (completion order, not
// input order) — used to stream results progressively while the sweep is still
// running. The returned array still preserves input order for non-streaming
// callers.
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
  onResult?: (result: R, item: T, index: number) => void,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0

  async function worker(): Promise<void> {
    while (true) {
      const index = next++
      if (index >= items.length) return
      const result = await fn(items[index], index)
      results[index] = result
      onResult?.(result, items[index], index)
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length))
  await Promise.all(Array.from({ length: workerCount }, worker))
  return results
}
