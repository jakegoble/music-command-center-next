import Link from 'next/link';

export function EmptyState({
  message,
  description,
  dashed = false,
  actionLabel,
  actionHref,
}: {
  message: string;
  description?: string;
  dashed?: boolean;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className={`flex flex-col items-center rounded-xl py-12 text-center ${
      dashed ? 'border border-dashed border-gray-700' : 'border border-gray-700/50 bg-gray-800/30'
    }`}>
      <p className="text-gray-400">{message}</p>
      {description && <p className="mt-2 max-w-md text-sm text-gray-500">{description}</p>}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-4 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-500"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
