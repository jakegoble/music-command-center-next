import { NextRequest, NextResponse } from 'next/server';
import { updateChangeStatus } from '@/lib/services/approvals';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body as { status: 'approved' | 'rejected' | 'auto_approved' };

    if (!['approved', 'rejected', 'auto_approved'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await updateChangeStatus(id, status);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to update approval', details: message },
      { status: 500 },
    );
  }
}
