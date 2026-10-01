import { useCallback, useEffect, useMemo } from 'react';
import { getListProfileCatalogQueryKey, useListProfileCatalog } from '@workspace/api-client-react';
import {
  isProfileCatalogRecord,
  PROFILE_CATALOG_UPDATED_EVENT,
  type ProfileCatalogRecord,
} from '../lib/profileCatalog';

function parseCatalogPayload(payload: unknown): ProfileCatalogRecord[] {
  const records = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { records?: unknown }).records)
      ? (payload as { records: unknown[] }).records
      : null;
  if (!records || !records.every(isProfileCatalogRecord)) {
    throw new Error('Сервер вернул данные каталога профилей в неподдерживаемом формате.');
  }
  if (new Set(records.map(record => record.kind)).size !== records.length) {
    throw new Error('В официальном каталоге повторяется тип профиля; проверьте данные каталога перед формированием КП.');
  }
  return records;
}

export function useProfileCatalog() {
  const query = useListProfileCatalog({
    query: {
      queryKey: getListProfileCatalogQueryKey(),
      refetchOnWindowFocus: false,
      staleTime: 0,
    },
    request: { cache: 'no-store', credentials: 'include' },
  });
  const parsed = useMemo(() => {
    if (query.data === undefined) return { records: null, error: null } as const;
    try {
      return { records: parseCatalogPayload(query.data), error: null } as const;
    } catch (cause) {
      return {
        records: null,
        error: cause instanceof Error ? cause.message : String(cause),
      } as const;
    }
  }, [query.data]);

  const queryError = query.error
    ? query.error instanceof Error ? query.error.message : String(query.error)
    : null;
  const loading = query.isLoading || query.isFetching;
  const error = parsed.error ?? queryError;
  const reload = useCallback(async () => {
    await query.refetch();
  }, [query.refetch]);

  useEffect(() => {
    const handleFreshness = () => { void reload(); };
    window.addEventListener('focus', handleFreshness);
    window.addEventListener(PROFILE_CATALOG_UPDATED_EVENT, handleFreshness);
    return () => {
      window.removeEventListener('focus', handleFreshness);
      window.removeEventListener(PROFILE_CATALOG_UPDATED_EVENT, handleFreshness);
    };
  }, [reload]);

  return { records: parsed.records, loading, error, reload };
}