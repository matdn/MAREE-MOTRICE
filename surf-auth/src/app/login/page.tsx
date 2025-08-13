import { LoginForm } from "../components/LoginForm";

export default function Page() {
    return (
        <main className="max-w-sm mx-auto py-16">
            <h1 className="text-2xl font-semibold mb-6">Sign in</h1>
            <LoginForm />
        </main>
    );
}
