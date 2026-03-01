'use client';

import { ErrorFallback } from '@/components/ErrorFallback';

export default function SyncPipelineError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorFallback pageName="Sync Pipeline" error={error} reset={reset} />;
}
