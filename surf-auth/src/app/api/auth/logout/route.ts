import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "../../../../../lib/session";

export async function POST(req: Request) {
    const res = NextResponse.json({ ok: true });
    const session = await getIronSession<SessionData>({ req, res, }, sessionOptions as any);
    session.destroy();
    return res;
}
