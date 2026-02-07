import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const SECRET = new TextEncoder().encode(
    process.env.ADMIN_JWT_SECRET || 'fallback-extremely-long-and-secure-secret-for-kord-intel'
);

export async function signToken(payload: { isAdmin: boolean }) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(SECRET);
}

export async function verifyToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, SECRET);
        return payload as { isAdmin: boolean };
    } catch (err) {
        return null;
    }
}

export async function isAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get('adminToken')?.value;
    if (!token) return false;

    const payload = await verifyToken(token);
    return payload?.isAdmin === true;
}
