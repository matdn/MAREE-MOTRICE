export type SessionData = { userId?: string; email?: string; };
import { SessionOptions } from "iron-session";
export const sessionOptions: SessionOptions = {
    password: process.env.SESSION_PASSWORD as string,
    cookieName: "surfapp_session",
    cookieOptions: { secure: process.env.NODE_ENV === "production" },
};
