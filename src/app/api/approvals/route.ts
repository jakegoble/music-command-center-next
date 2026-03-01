import { NextResponse } from 'next/server';
import { fetchAllChanges, fetchAuditLog } from '@/lib/services/approvals';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view');

    if (view === 'audit') {
      const entries = await fetchAuditLog();
      return NextResponse.json({ entries });
    }

    const changes = await fetchAllChanges();
    return NextResponse.json({ changes });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isConfig = message.includes('not configured');
    return NextResponse.json(
      { error: 'Failed to fetch approvals', details: message },
      { status: isConfig ? 503 : 500 },
    );
  }
}
