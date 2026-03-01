export default function AlbumsLoading() {
  return (
    <div>
      <div className="h-8 w-40 animate-pulse rounded-lg bg-gray-800/50" />
      <div className="mt-4 h-10 w-48 animate-pulse rounded-lg bg-gray-800/50" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-800/50" />
        ))}
      </div>
    </div>
  );
}
