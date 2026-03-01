'use client';

import { ErrorFallback } from '@/components/ErrorFallback';

export default function CollaboratorsError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorFallback pageName="Collaborators" error={error} reset={reset} />;
}
