export default function ContentLoading() {
  return (
    <div>
      <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-800/50" />
      <div className="mt-4 h-10 w-64 animate-pulse rounded-lg bg-gray-800/50" />
      <div className="mt-4 grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-800/50" />
        ))}
      </div>
    </div>
  );
}
