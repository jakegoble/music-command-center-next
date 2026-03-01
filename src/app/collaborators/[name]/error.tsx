'use client';

import { ErrorFallback } from '@/components/ErrorFallback';

export default function CollaboratorDetailError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorFallback pageName="Collaborator Detail" error={error} reset={reset} />;
}
