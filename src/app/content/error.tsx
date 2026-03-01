'use client';

import { ErrorFallback } from '@/components/ErrorFallback';

export default function ContentError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorFallback pageName="Content Pipeline" error={error} reset={reset} />;
}
