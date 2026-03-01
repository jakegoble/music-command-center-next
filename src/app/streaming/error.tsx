'use client';

import { ErrorFallback } from '@/components/ErrorFallback';

export default function StreamingError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorFallback pageName="Streaming" error={error} reset={reset} />;
}
