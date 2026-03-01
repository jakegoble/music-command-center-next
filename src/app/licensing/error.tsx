'use client';

import { ErrorFallback } from '@/components/ErrorFallback';

export default function LicensingError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorFallback pageName="Licensing" error={error} reset={reset} />;
}
