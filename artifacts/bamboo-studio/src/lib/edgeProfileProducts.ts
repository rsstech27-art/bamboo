export type EdgeProfileProduct = {
  id: number;
  category: string;
  name: string;
  article: string;
  series: string | null;
  size: string | null;
  color: string | null;
  cost: number;
};

/** Group existing records for display only; never rename series or migrate prices. */
export function isEdgeProfileProduct(
  product: Pick<EdgeProfileProduct, 'category' | 'series'>,
  definitions: readonly { id: string; name: string }[],
): boolean {
  return product.category === 'molding' && definitions.some(
    definition => (definition.id === 'edge' || definition.id.startsWith('edge_')) &&
      definition.name === product.series,
  );
}
