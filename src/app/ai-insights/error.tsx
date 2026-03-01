'use client';

import { ErrorFallback } from '@/components/ErrorFallback';

export default function AIInsightsError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorFallback pageName="AI Insights" error={error} reset={reset} />;
}
