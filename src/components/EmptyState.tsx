export function EmptyState({
  message,
  description,
  dashed = false,
}: {
  message: string;
  description?: string;
  dashed?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center rounded-xl py-12 text-center ${
      dashed ? 'border border-dashed border-gray-700' : 'border border-gray-700/50 bg-gray-800/30'
    }`}>
      <p className="text-gray-400">{message}</p>
      {description && <p className="mt-2 max-w-md text-sm text-gray-500">{description}</p>}
    </div>
  );
}
