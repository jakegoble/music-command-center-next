import { NextRequest, NextResponse } from 'next/server';
import {
  fetchProject,
  updateProject,
  deleteProject,
  updateChecklist,
} from '@/lib/services/content-pipeline';
import type { ContentStage, ContentType, ChecklistItem } from '@/lib/services/content-pipeline';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const project = await fetchProject(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch project', details: String(error) },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, ...data } = body as {
      action?: 'update_stage' | 'toggle_checklist';
      stage?: ContentStage;
      type?: ContentType;
      title?: string;
      checklist?: ChecklistItem[];
      publishDate?: string | null;
      assignedTo?: string | null;
      notes?: string | null;
      views?: number | null;
      likes?: number | null;
      itemId?: string;
      isComplete?: boolean;
    };

    if (action === 'toggle_checklist') {
      if (!data.itemId || data.isComplete === undefined) {
        return NextResponse.json({ error: 'itemId and isComplete required' }, { status: 400 });
      }
      await updateChecklist(id, data.itemId, data.isComplete);
      return NextResponse.json({ success: true });
    }

    await updateProject(id, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update project', details: String(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await deleteProject(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete project', details: String(error) },
      { status: 500 },
    );
  }
}
