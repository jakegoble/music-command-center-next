export default function DashboardLoading() {
  return (
    <div>
      <div className="h-8 w-40 animate-pulse rounded-lg bg-gray-800/50" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-800/50" />
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-800/50" />
        ))}
      </div>
    </div>
  );
}
