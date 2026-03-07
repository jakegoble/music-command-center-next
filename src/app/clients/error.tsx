'use client';

export default function Error({ error }: { error: Error }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Clients</h1>
      <div className="mt-6 rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-300">
        Failed to load clients: {error.message}
      </div>
    </div>
  );
}
