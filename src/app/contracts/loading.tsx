export default function ContractsLoading() {
  return (
    <div>
      <div className="h-8 w-40 animate-pulse rounded-lg bg-gray-800/50" />
      <div className="mt-4 flex gap-3">
        <div className="h-10 w-40 animate-pulse rounded-lg bg-gray-800/50" />
        <div className="h-10 w-40 animate-pulse rounded-lg bg-gray-800/50" />
        <div className="h-10 flex-1 animate-pulse rounded-lg bg-gray-800/50" />
      </div>
      <div className="mt-4 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-800/50" />
        ))}
      </div>
    </div>
  );
}
