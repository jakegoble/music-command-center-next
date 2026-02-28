import { NextRequest, NextResponse } from 'next/server';
import { fetchContracts } from '@/lib/services/contracts';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') ?? undefined;
    const type = searchParams.get('type') ?? undefined;

    const contracts = await fetchContracts(status, type);

    return NextResponse.json({
      contracts,
      total: contracts.length,
    });
  } catch (error) {
    console.error('[/api/contracts] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contracts', details: String(error) },
      { status: 500 },
    );
  }
}
