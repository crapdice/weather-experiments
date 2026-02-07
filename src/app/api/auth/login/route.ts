import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const { password } = await req.json();

        // In a real app, this would be a hash comparison with a DB or secured ENV
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'kord-admin-2026';

        if (password === ADMIN_PASSWORD) {
            const token = await signToken({ isAdmin: true });

            const response = NextResponse.json({ success: true });

            response.cookies.set('adminToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24, // 24 hours
                path: '/',
            });

            return response;
        }

        return NextResponse.json({ success: false, error: 'Unauthorized Access Denied' }, { status: 401 });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Invalid Request' }, { status: 400 });
    }
}
