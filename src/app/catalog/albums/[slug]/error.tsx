'use client';

import { ErrorFallback } from '@/components/ErrorFallback';

export default function AlbumDetailError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorFallback pageName="Album Detail" error={error} reset={reset} />;
}
