import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { feedback } = body;

        if (!feedback || typeof feedback !== 'string' || feedback.trim().length === 0) {
            return NextResponse.json({ error: 'Feedback message is required' }, { status: 400 });
        }

        if (feedback.length > 2000) {
            return NextResponse.json({ error: 'Feedback is too long' }, { status: 400 });
        }

        // In a real app, you would save this to a database or send to a slack/email service.
        // For this sandbox, we'll log it strictly server-side.
        console.log('[FEEDBACK RECEIVED]:', {
            content: feedback,
            ip: req.headers.get('x-forwarded-for') || 'local',
            userAgent: req.headers.get('user-agent'),
            timestamp: new Date().toISOString()
        });

        return NextResponse.json({ status: 'success', message: 'Transmission Received' });
    } catch (error) {
        console.error('Feedback API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
