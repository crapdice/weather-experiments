import { NextRequest, NextResponse } from 'next/server';
import { getAdminSettings, saveAdminSettings } from '@/utils/adminSettings';
import { isAdmin as validateAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    if (!await validateAdmin()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const settings = getAdminSettings();
    return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
    if (!await validateAdmin()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { weeks } = body;

        if (typeof weeks !== 'number' || weeks < 1 || weeks > 52) {
            return NextResponse.json({ error: 'Weeks must be a number between 1 and 52' }, { status: 400 });
        }

        const currentSettings = getAdminSettings();
        saveAdminSettings({ ...currentSettings, publicApiWeeks: weeks });

        return NextResponse.json({ success: true, weeks });
    } catch (e) {
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }
}
