import { RegisterForm } from "../components/RegisterForm";
export default function Page() {
    return (
        <main className="relative min-h-dvh overflow-hidden bg-black text-white">
            {/* Blobs + grain */}
            <div className="pointer-events-none absolute inset-0">
                <div
                    className="blob-bg absolute h-[42rem] w-[42rem] rounded-full blur-[70px] opacity-30 mix-blend-screen animate-[var(--animate-float)]"
                    style={{ top: "-10%", left: "-10%", animationDelay: "0s" }}
                />
                <div
                    className="blob-bg absolute h-[42rem] w-[42rem] rounded-full blur-[70px] opacity-30 mix-blend-screen animate-[var(--animate-float)]"
                    style={{ bottom: "-15%", right: "-15%", animationDelay: "3s" }}
                />
                <div
                    className="blob-bg absolute h-[42rem] w-[42rem] rounded-full blur-[70px] opacity-30 mix-blend-screen animate-[var(--animate-float)]"
                    style={{ top: "20%", right: "10%", animationDelay: "6s" }}
                />
                <div className="grain-bg absolute -inset-[100%] mix-blend-soft-light animate-[var(--animate-grain)]" />
            </div>

            {/* Card */}
            <section className="relative z-10 flex min-h-dvh items-center justify-center p-6">
                <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
                    <header className="px-6 pt-6">
                        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
                        <p className="mt-1 text-sm text-white/60">Rejoignez l’app — minimal, rapide, efficace.</p>
                    </header>
                    <div className="p-6">
                        <RegisterForm />
                    </div>
                </div>
            </section>
        </main>
    );
}
