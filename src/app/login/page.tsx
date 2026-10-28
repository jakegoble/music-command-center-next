import { redirect } from 'next/navigation';
import { auth, signIn } from '@/auth';

export const metadata = { title: 'Sign in — Music Command Center' };

function safeCallback(url: string | undefined): string {
  // Only allow same-site relative paths.
  return url && url.startsWith('/') && !url.startsWith('//') ? url : '/';
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;
  const target = safeCallback(callbackUrl);
  if (await auth()) redirect(target);

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-xl border border-gray-800 bg-gray-900/60 p-8 text-center">
        <h1 className="text-xl font-semibold text-gray-100">Music Command Center</h1>
        <p className="mt-2 text-sm text-gray-400">Sign in with an approved Google account.</p>
        {error && (
          <p className="mt-4 rounded-md bg-red-950/60 px-3 py-2 text-sm text-red-300">
            {error === 'AccessDenied'
              ? 'That Google account isn’t on the approved list.'
              : 'Sign-in failed. Try again.'}
          </p>
        )}
        <form
          className="mt-6"
          action={async () => {
            'use server';
            await signIn('google', { redirectTo: target });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
          >
            Sign in with Google
          </button>
        </form>
      </div>
    </div>
  );
}
