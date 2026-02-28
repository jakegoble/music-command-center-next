import { NextResponse } from 'next/server';
import { fetchAllCollaborators } from '@/lib/services/collaborators';

export async function GET() {
  try {
    const collaborators = await fetchAllCollaborators();

    return NextResponse.json({
      collaborators,
      total: collaborators.length,
    });
  } catch (error) {
    console.error('[/api/collaborators] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collaborators', details: String(error) },
      { status: 500 },
    );
  }
}
