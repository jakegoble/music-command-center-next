import { NextRequest, NextResponse } from 'next/server';
import { fetchLicensingContacts } from '@/lib/services/licensing-contacts';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') ?? undefined;
    const genreFocus = searchParams.get('genre_focus') ?? undefined;

    const contacts = await fetchLicensingContacts(status, genreFocus);

    return NextResponse.json({
      contacts,
      total: contacts.length,
    });
  } catch (error) {
    console.error('[/api/licensing-contacts] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch licensing contacts', details: String(error) },
      { status: 500 },
    );
  }
}
