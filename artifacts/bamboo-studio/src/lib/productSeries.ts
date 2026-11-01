/** Use the current catalog only, never reconstruct deleted series from products. */
export function activeProductSeries(
  definitions: readonly { id: string; name: string; price: number }[],
  hiddenIds: readonly string[],
): Array<{ name: string; price: number }> {
  const hidden = new Set(hiddenIds);
  return definitions.filter(series => !hidden.has(series.id))
    .map(({ name, price }) => ({ name, price }));
}
