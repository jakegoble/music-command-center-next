export default function Loading() {
  return (
    <div>
      <div className="h-8 w-48 animate-pulse rounded bg-gray-800/50" />
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-800/50" />
        ))}
      </div>
      <div className="mt-6 h-96 animate-pulse rounded-xl bg-gray-800/50" />
    </div>
  );
}
