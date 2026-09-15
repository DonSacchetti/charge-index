/**
 * Read every row of a Supabase query. The API returns at most 1,000 rows per
 * request by default and says nothing when it truncates, so anything that
 * spans all clients (the roster, bulk exports) pages through with range().
 *
 * `build` must return a fresh, ordered query each time — ordering keeps pages
 * from overlapping or skipping rows.
 */
export async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}
