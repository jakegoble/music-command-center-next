import { NextRequest, NextResponse } from 'next/server';
import { fetchClients } from '@/lib/services/clients';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') ?? undefined;
    const warmth = searchParams.get('warmth') ?? undefined;
    const industry = searchParams.get('industry') ?? undefined;

    const clients = await fetchClients(status, warmth, industry);

    return NextResponse.json({
      clients,
      total: clients.length,
    });
  } catch (error) {
    console.error('[/api/clients] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients', details: String(error) },
      { status: 500 },
    );
  }
}
