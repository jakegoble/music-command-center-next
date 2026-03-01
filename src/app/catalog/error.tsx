'use client';

import { ErrorFallback } from '@/components/ErrorFallback';

export default function CatalogError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorFallback pageName="Catalog" error={error} reset={reset} />;
}
