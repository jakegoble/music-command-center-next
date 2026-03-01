'use client';

import { ErrorFallback } from '@/components/ErrorFallback';

export default function ContractsError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorFallback pageName="Contracts" error={error} reset={reset} />;
}
