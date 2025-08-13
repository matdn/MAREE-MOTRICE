"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LoginForm() {
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const router = useRouter();

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        const f = e.currentTarget as HTMLFormElement;
        const email = (f.elements.namedItem("email") as HTMLInputElement).value;
        const password = (f.elements.namedItem("password") as HTMLInputElement).value;
        setError(""); setSuccess("");
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        let data: any = null;
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) data = await res.json();
        else data = { error: await res.text() || (res.ok ? null : "Non-JSON response") };

        if (!res.ok) {
            setError(data?.error || `HTTP ${res.status}`);
            return;
        }

        setSuccess("Signed in. Redirecting…");
        setTimeout(() => router.push("/"), 800);

    }
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {success && <p className="text-green-500 text-sm">{success}</p>}
            <Button type="submit" className="w-full">Sign in</Button>
        </form>
    );
}
