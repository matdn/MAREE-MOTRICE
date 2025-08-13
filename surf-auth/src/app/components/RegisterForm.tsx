"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RegisterForm() {
    const router = useRouter();
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const f = e.currentTarget;
        const email = (f.elements.namedItem("email") as HTMLInputElement).value;
        const password = (f.elements.namedItem("password") as HTMLInputElement).value;
        const confirm = (f.elements.namedItem("confirm") as HTMLInputElement).value;

        setError("");
        setSuccess("");

        if (password !== confirm) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            let data: any = null;
            const ct = res.headers.get("content-type") || "";
            if (ct.includes("application/json")) data = await res.json();
            else data = { error: await res.text() };

            if (!res.ok) {
                setError(data?.error || `HTTP ${res.status}`);
                return;
            }

            setSuccess("Registration successful. Redirecting…");
            setTimeout(() => router.push("/login"), 900);
        } catch (err) {
            setError("Network error.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid gap-2">
                <label htmlFor="email" className="text-sm text-white/80">Email</label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className="h-11 rounded-lg border border-white/15 bg-white/5 px-3 text-white placeholder-white/40 outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
                    placeholder="you@example.com"
                />
            </div>

            <div className="grid gap-2">
                <label htmlFor="password" className="text-sm text-white/80">Password</label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    className="h-11 rounded-lg border border-white/15 bg-white/5 px-3 text-white placeholder-white/40 outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
                    placeholder="At least 6 characters"
                />
            </div>

            <div className="grid gap-2">
                <label htmlFor="confirm" className="text-sm text-white/80">Confirm password</label>
                <input
                    id="confirm"
                    name="confirm"
                    type="password"
                    required
                    autoComplete="new-password"
                    className="h-11 rounded-lg border border-white/15 bg-white/5 px-3 text-white placeholder-white/40 outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
                    placeholder="Repeat your password"
                />
            </div>

            {error && (
                <p className="text-sm rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-300">
                    {error}
                </p>
            )}
            {success && (
                <p className="text-sm rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-300">
                    {success}
                </p>
            )}

            <button
                type="submit"
                disabled={loading}
                className="group relative flex h-11 w-full items-center justify-center overflow-hidden rounded-lg border border-white/20 bg-white/10 px-4 font-medium text-white transition hover:bg-white/15 disabled:opacity-60"
            >
                <span className={`transition ${loading ? "opacity-0" : "opacity-100"}`}>Create account</span>
                <span
                    aria-hidden
                    className={`absolute inset-0 -z-0 bg-[radial-gradient(60%_60%_at_50%_50%,rgba(255,255,255,0.25)_0%,rgba(255,255,255,0)_70%)] opacity-0 transition group-hover:opacity-100`}
                />
                {loading && (
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-80" d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" />
                    </svg>
                )}
            </button>

            <p className="text-center text-sm text-white/70">
                Already have an account?{" "}
                <a href="/login" className="underline decoration-white/40 underline-offset-4 hover:decoration-white">
                    Sign in
                </a>
            </p>
        </form>
    );
}
