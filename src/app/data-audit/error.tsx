'use client';

import { ErrorFallback } from '@/components/ErrorFallback';

export default function DataAuditError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorFallback pageName="Data Audit" error={error} reset={reset} />;
}
