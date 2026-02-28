import { NextRequest, NextResponse } from 'next/server';
import { fetchCollaboratorBySlug } from '@/lib/services/collaborators';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await params;
    const collaborator = await fetchCollaboratorBySlug(name);

    if (!collaborator) {
      return NextResponse.json({ error: 'Collaborator not found' }, { status: 404 });
    }

    return NextResponse.json(collaborator);
  } catch (error) {
    console.error('[/api/collaborators/[name]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collaborator', details: String(error) },
      { status: 500 },
    );
  }
}
