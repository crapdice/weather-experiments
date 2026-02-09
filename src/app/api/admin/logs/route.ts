import { NextRequest, NextResponse } from 'next/server';
import { getAILogs } from '@/services/aiLogger';
import { isAdmin as validateAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    if (!await validateAdmin()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const searchParams = req.nextUrl.searchParams;
        const limitStr = searchParams.get('limit');
        const limit = limitStr ? parseInt(limitStr) : 100;

        const logs = await getAILogs(limit);
        return NextResponse.json(logs);
    } catch (e) {
        console.error("API Error fetching logs:", e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
