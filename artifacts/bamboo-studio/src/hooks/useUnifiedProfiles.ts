import { useEffect, useState, useCallback } from 'react';
import { emptyCatalog, validateCatalog, validatePanelThicknesses, type Variant, type Thickness } from '@workspace/profile-system';
import { managerFetch } from '../lib/managerApi';

// A failed fetch never restores a cached price or silently activates legacy defaults.
export function useUnifiedProfiles() {
  const [catalog, setCatalog] = useState<Variant[]>(emptyCatalog);
  const [panelThicknesses, setPanelThicknesses] = useState<Record<string, Thickness>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/settings', { credentials: 'include' });
      if (!r.ok) throw new Error('Не удалось загрузить каталог профилей.');
      const settings = await r.json();
      if (settings.profile_variants !== undefined && !validateCatalog(settings.profile_variants))
        throw new Error('Каталог профилей повреждён. Проверьте настройки менеджера.');
      if (settings.panel_thicknesses !== undefined && !validatePanelThicknesses(settings.panel_thicknesses))
        throw new Error('Некорректные данные о толщине панелей.');
      setCatalog(settings.profile_variants ?? emptyCatalog());
      setPanelThicknesses(settings.panel_thicknesses ?? {});
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки настроек.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void reload();
    const listener = () => { void reload(); };
    window.addEventListener('unified-profiles-updated', listener);
    return () => window.removeEventListener('unified-profiles-updated', listener);
  }, [reload]);
  const save = async (key: string, value: unknown) => {
    const r = await managerFetch(`/api/settings/${key}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value),
    });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.error ?? 'Настройки не сохранены.');
    }
    window.dispatchEvent(new Event('unified-profiles-updated'));
  };
  return {
    catalog, panelThicknesses, loading, error, reload,
    saveCatalog: (rows: Variant[]) => save('profile_variants', rows),
    savePrices: async (rows: Variant[]) => {
      const r=await managerFetch('/api/settings/profile_variants/prices',{
        method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(Object.fromEntries(rows.filter(v=>v.confirmed).map(v=>[v.id,v.price]))),
      });
      if(!r.ok) {
        const body=await r.json().catch(()=>({}));
        throw new Error(body.error ?? 'Цены не сохранены.');
      }
      window.dispatchEvent(new Event('unified-profiles-updated'));
    },
    savePanelThicknesses: (map: Record<string, Thickness>) => save('panel_thicknesses', map),
  };
}