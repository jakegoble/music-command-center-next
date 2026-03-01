export default function CatalogLoading() {
  return (
    <div>
      <div className="h-8 w-40 animate-pulse rounded-lg bg-gray-800/50" />
      <div className="mt-4 h-10 animate-pulse rounded-lg bg-gray-800/50" />
      <div className="mt-4 h-10 w-32 animate-pulse rounded-lg bg-gray-800/50" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-800/50" />
        ))}
      </div>
    </div>
  );
}
