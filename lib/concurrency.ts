export async function mapConcurrent<T, R>(
  items: readonly T[],
  concurrency: number,
  operation: (item: T, index: number) => Promise<R>,
  onSettled?: (completed: number, total: number) => void,
): Promise<PromiseSettledResult<R>[]> {
  const results = new Array<PromiseSettledResult<R>>(items.length);
  let cursor = 0;
  let completed = 0;
  const workerCount = Math.min(
    items.length,
    Math.max(1, Math.floor(concurrency)),
  );

  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = {
          status: "fulfilled",
          value: await operation(items[index], index),
        };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
      completed += 1;
      onSettled?.(completed, items.length);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}
