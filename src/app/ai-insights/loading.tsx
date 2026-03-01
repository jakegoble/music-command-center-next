export default function AIInsightsLoading() {
  return (
    <div>
      <div className="h-8 w-40 animate-pulse rounded-lg bg-gray-800/50" />
      <div className="mt-6 h-40 animate-pulse rounded-xl bg-gray-800/50" />
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="h-72 animate-pulse rounded-xl bg-gray-800/50 lg:col-span-3" />
        <div className="h-72 animate-pulse rounded-xl bg-gray-800/50 lg:col-span-2" />
      </div>
      <div className="mt-4 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-800/50" />
        ))}
      </div>
    </div>
  );
}
