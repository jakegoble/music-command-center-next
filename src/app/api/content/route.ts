import { NextRequest, NextResponse } from 'next/server';
import { fetchAllProjects, createProject } from '@/lib/services/content-pipeline';
import type { ContentType } from '@/lib/services/content-pipeline';

export async function GET() {
  try {
    const projects = await fetchAllProjects();
    return NextResponse.json({ projects });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isConfig = message.includes('not configured');
    return NextResponse.json(
      { error: 'Failed to fetch content projects', details: message },
      { status: isConfig ? 503 : 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, type, publishDate, assignedTo, notes } = body as {
      title: string;
      type: ContentType;
      publishDate?: string;
      assignedTo?: string;
      notes?: string;
    };

    if (!title || !type) {
      return NextResponse.json({ error: 'title and type are required' }, { status: 400 });
    }

    const project = await createProject({ title, type, publishDate, assignedTo, notes });
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to create content project', details: message },
      { status: 500 },
    );
  }
}
