'use client';

import { ErrorFallback } from '@/components/ErrorFallback';

export default function SongDetailError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorFallback pageName="Song Detail" error={error} reset={reset} />;
}
