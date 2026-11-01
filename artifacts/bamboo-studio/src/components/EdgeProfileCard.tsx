import { Pencil } from 'lucide-react';
import type { EdgeProfileProduct } from '../lib/edgeProfileProducts';

export function EdgeProfileCard({ products, canEdit, onEdit }: {
  products: EdgeProfileProduct[];
  canEdit: boolean;
  onEdit: () => void;
}) {
  if (!products.length) return null;
  const colors = [...new Set(products.map(p => p.color?.trim()).filter(Boolean))];
  const sizes = [...new Set(products.map(p => p.size?.trim()).filter(Boolean))];
  const articles = [...new Set(products.map(p => p.article))];
  const price = (amount: number) => `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(amount)} ₽`;
  return (
    <div data-testid="card-edge-profile" className="w-full min-w-0 max-w-full bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow transition-shadow">
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-gray-900">Торцевой профиль</div>
        <div className="text-xs text-gray-500 mt-0.5 break-words">
          {articles.length === 1 ? 'Артикул' : 'Артикулы'} {articles.join(', ')}
          {sizes.length > 0 && ` · ${sizes.join(', ')}`}
        </div>
        {colors.length > 0 && <div className="text-[11px] text-gray-400 mt-0.5 break-words">{colors.join(', ')}</div>}
        <div className="text-[11px] text-gray-400 mt-0.5 break-words">
          {products.map(p => `${p.color?.trim() || p.name}: ${price(p.cost)}`).join(' · ')}
        </div>
      </div>
      {canEdit && (
        <button type="button" onClick={onEdit} data-testid="button-edit-edge-profile"
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:border-black hover:text-black hover:bg-gray-50 transition-colors">
          <Pencil size={12} /> Изменить
        </button>
      )}
    </div>
  );
}
