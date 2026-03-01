'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ErrorFallbackProps {
  pageName: string;
  error: Error;
  reset: () => void;
}

export function ErrorFallback({ pageName, error, reset }: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-red-800/50 bg-red-950/20 p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-900/30">
          <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white">Something went wrong loading {pageName}</h2>
        <p className="mt-2 text-sm text-gray-400">An unexpected error occurred. Try again or go back to the dashboard.</p>

        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500 transition-colors"
          >
            Retry
          </button>
          <Link
            href="/"
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Go Home
          </Link>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="mt-4 text-xs text-gray-500 hover:text-gray-400 transition-colors"
        >
          {showDetails ? 'Hide details' : 'Show details'}
        </button>
        {showDetails && (
          <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-gray-900 p-3 text-left text-xs text-red-300">
            {error.message}
          </pre>
        )}
      </div>
    </div>
  );
}
