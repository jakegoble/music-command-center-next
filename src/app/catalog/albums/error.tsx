'use client';

import { ErrorFallback } from '@/components/ErrorFallback';

export default function AlbumsError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorFallback pageName="Albums" error={error} reset={reset} />;
}
