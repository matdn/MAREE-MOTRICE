import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "../../../../../lib/session";

export async function GET() {
    try {
        const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
        if (!session.userId) return NextResponse.json({ authenticated: false });
        return NextResponse.json({ authenticated: true, email: session.email });
    } catch (e) {
        return NextResponse.json({ authenticated: false }, { status: 500 });
    }
}
