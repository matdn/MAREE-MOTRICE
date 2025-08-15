import { LoginForm } from "../components/LoginForm";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Page() {
    return (
        <main className="max-w-sm mx-auto py-16">
            <h1 className="text-2xl font-semibold mb-6">Sign in</h1>
            <LoginForm />
        </main>
    );
}
