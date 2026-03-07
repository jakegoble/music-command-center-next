import { NextRequest, NextResponse } from 'next/server';
import { invalidateCache } from '@/lib/clients/notion';
import { fetchClients } from '@/lib/services/clients';

// ---------------------------------------------------------------------------
// Client data sync — refreshes the client cache from Notion.
// Runs 4x/day via Vercel Cron (every 6 hours).
//
// GET /api/cron/client-sync
//   Auth: Authorization: Bearer <CRON_SECRET>
//   Or query param: ?secret=<ADMIN_SECRET>
// ---------------------------------------------------------------------------

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;

  const adminSecret = process.env.ADMIN_SECRET;
  const secretParam = request.nextUrl.searchParams.get('secret');
  if (adminSecret && secretParam === adminSecret) return true;

  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    // Invalidate existing client cache so we get fresh data
    invalidateCache('clients');

    // Re-fetch from Notion (populates the cache)
    const clients = await fetchClients();

    const elapsed = Date.now() - startTime;

    return NextResponse.json({
      ok: true,
      clients_synced: clients.length,
      elapsed_ms: elapsed,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Client sync failed', details: (err as Error).message },
      { status: 500 },
    );
  }
}
