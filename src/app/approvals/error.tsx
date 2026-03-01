'use client';

import { ErrorFallback } from '@/components/ErrorFallback';

export default function ApprovalsError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorFallback pageName="Approvals" error={error} reset={reset} />;
}
