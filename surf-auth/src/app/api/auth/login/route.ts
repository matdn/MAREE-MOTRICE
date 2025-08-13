// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "../../../../../lib/session";
import { prisma } from "../../../../../lib/prisma";



const Schema = z.object({ email: z.string().email(), password: z.string().min(6) });

export async function POST(req: Request) {
    try {
        const json = await req.json().catch(() => null);
        const parsed = Schema.safeParse(json);
        if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

        const store = await cookies();
        const session = await getIronSession<SessionData>(store, sessionOptions);
        if (!sessionOptions.password || sessionOptions.password.length < 32) {
            return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
        }

        session.userId = user.id;
        session.email = user.email;
        await session.save();

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        const msg = process.env.NODE_ENV === "production" ? "Server error" : e?.message || "Server error";
        console.error("LOGIN_ERROR:", e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

export function GET() {
    return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
