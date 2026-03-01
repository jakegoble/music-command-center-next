import { NextRequest, NextResponse } from 'next/server';
import { batchUpdateStatus } from '@/lib/services/approvals';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, status } = body as { ids: string[]; status: 'approved' | 'rejected' | 'auto_approved' };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
    }
    if (!['approved', 'rejected', 'auto_approved'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await batchUpdateStatus(ids, status);
    return NextResponse.json({ success: true, updated: ids.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to batch update approvals', details: message },
      { status: 500 },
    );
  }
}
