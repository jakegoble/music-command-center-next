'use client';

import { ErrorFallback } from '@/components/ErrorFallback';

export default function RoyaltiesError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorFallback pageName="Revenue" error={error} reset={reset} />;
}
