import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "../../../../../lib/session";

export async function POST(_req: Request) {
    const store = await cookies();
    const session = await getIronSession<SessionData>(store, sessionOptions);
    await session.destroy();
    return NextResponse.json({ ok: true });
}
