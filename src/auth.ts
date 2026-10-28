import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

// ---------------------------------------------------------------------------
// Google sign-in for the whole command center.
// Only addresses listed in ALLOWED_EMAILS (comma-separated) may sign in.
// Required env vars: AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, ALLOWED_EMAILS
// ---------------------------------------------------------------------------

function allowedEmails(): Set<string> {
  return new Set(
    (process.env.ALLOWED_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  trustHost: true,
  pages: { signIn: '/login', error: '/login' },
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  callbacks: {
    signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      // Fail closed: an empty allowlist lets nobody in.
      return Boolean(email && profile?.email_verified && allowedEmails().has(email));
    },
  },
});
