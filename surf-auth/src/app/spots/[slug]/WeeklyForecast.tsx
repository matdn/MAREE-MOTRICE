"use client";
import { useRef } from "react";

export type DaySummary = {
    dateISO: string;
    label: string;
    heightMax?: number;
    periodMax?: number;
    dirAvg?: number;
    dirTxt: string;
    windWavePeakMax?: number;
};
export type Units = { wh: string; wp: string; wpp: string; };
// --- mini helpers (copie locale) ---
type Rating = {
    score: number;
    label: "Très mauvais" | "Mauvais" | "Moyen" | "Bon" | "Très bon" | "Épique";
    tone: "red" | "amber" | "zinc" | "emerald" | "teal" | "sky";
};
const to100 = (x: number) => Math.max(0, Math.min(1, x)) * 100;
function bell(v: number | undefined, a: number, b: number, c: number, d: number) { if (v == null || Number.isNaN(v)) return 0; if (v <= a || v >= d) return 0; if (v >= b && v <= c) return 1; if (v < b) return (v - a) / (b - a); return (d - v) / (d - c); }
function smoothness(w?: number) { if (w == null || Number.isNaN(w)) return 0.5; return Math.max(0, Math.min(1, (w - 3) / (10 - 3))); }
function rateConditions(params: { height?: number; period?: number; windWavePeak?: number; }): Rating {
    const h = bell(params.height, 0.2, 0.8, 2.5, 4.5), p = bell(params.period, 6, 10, 16, 22), s = smoothness(params.windWavePeak);
    const combo = to100(0.48 * h + 0.42 * p + 0.10 * s);
    let label: Rating["label"], tone: Rating["tone"];
    if (combo < 20) { label = "Très mauvais"; tone = "red"; }
    else if (combo < 40) { label = "Mauvais"; tone = "amber"; }
    else if (combo < 60) { label = "Moyen"; tone = "zinc"; }
    else if (combo < 75) { label = "Bon"; tone = "emerald"; }
    else if (combo < 90) { label = "Très bon"; tone = "teal"; }
    else { label = "Épique"; tone = "sky"; }
    return { score: Math.round(combo), label, tone };
}
function toneClass(tone: Rating["tone"]) {
    const m: Record<Rating["tone"], string> = {
        red: "border-red-400/30 text-red-200",
        amber: "border-amber-400/30 text-amber-200",
        zinc: "border-white/20 text-white/80",
        emerald: "border-emerald-400/30 text-emerald-200",
        teal: "border-teal-400/30 text-teal-200",
        sky: "border-sky-400/30 text-sky-200",
    }; return m[tone];
}

export default function WeeklyForecast({
    week,
    units,
}: { week: DaySummary[]; units: Units; }) {
    const ref = useRef<HTMLDivElement>(null);

    function scrollByCards(dir: 1 | -1) {
        const el = ref.current;
        if (!el) return;
        const card = el.querySelector<HTMLElement>("[data-card]");
        const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
        el.scrollBy({ left: dir * step, behavior: "smooth" });
    }

    if (!week?.length) {
        return (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <h2 className="text-lg font-medium">Prévisions de la semaine</h2>
                <p className="mt-4 text-sm text-white/60">Données insuffisantes.</p>
            </div>
        );
    }



    return (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium">Prévisions de la semaine</h2>
                    <p className="text-xs text-white/60">Faites glisser ↔ ou utilisez les flèches.</p>
                </div>
                <div className="hidden gap-2 sm:flex">
                    <button
                        onClick={() => scrollByCards(-1)}
                        className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 hover:bg-white/15"
                        aria-label="Précédent"
                    >
                        ←
                    </button>
                    <button
                        onClick={() => scrollByCards(1)}
                        className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 hover:bg-white/15"
                        aria-label="Suivant"
                    >
                        →
                    </button>
                </div>
            </div>

            <div
                ref={ref}
                className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none]"
                style={{ scrollBehavior: "smooth" }}
            >
                {/* hide scrollbar (webkit) */}
                <style jsx>{`
          div::-webkit-scrollbar { display: none; }
        `}</style>

                {week.map((d) => (

                    <article
                        key={d.dateISO}
                        data-card
                        className="min-w-[78%] sm:min-w-[360px] snap-start rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                    >
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">{d.label}</div>
                            <span className="text-[10px] uppercase tracking-wider text-white/60">
                                {new Date(d.dateISO).toLocaleDateString(undefined, { weekday: "short" })}
                            </span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                            <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                                <div className="text-[10px] uppercase tracking-wider text-white/60">Hauteur max</div>
                                <div className="mt-1 text-lg font-semibold">
                                    {d.heightMax != null ? `${d.heightMax.toFixed(1)} ${units.wh}` : "—"}
                                </div>
                            </div>

                            <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                                <div className="text-[10px] uppercase tracking-wider text-white/60">Période max</div>
                                <div className="mt-1 text-lg font-semibold">
                                    {d.periodMax != null ? `${Math.round(d.periodMax)} ${units.wp}` : "—"}
                                </div>
                            </div>

                            <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                                <div className="text-[10px] uppercase tracking-wider text-white/60">Direction moy.</div>
                                <div className="mt-1 text-lg font-semibold">
                                    {d.dirAvg != null ? `${Math.round(d.dirAvg)}° ${d.dirTxt}` : "—"}
                                </div>
                            </div>

                            <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                                <div className="text-[10px] uppercase tracking-wider text-white/60">Pic vagues vent</div>
                                <div className="mt-1 text-lg font-semibold">
                                    {d.windWavePeakMax != null ? `${Math.round(d.windWavePeakMax)} ${units.wpp}` : "—"}
                                </div>
                            </div>
                        </div>
                        {/* Score du jour */}
                        {(() => {
                            const r = rateConditions({
                                height: d.heightMax,
                                period: d.periodMax,
                                windWavePeak: d.windWavePeakMax,
                            });
                            return (
                                <div className={`mt-2 inline-flex items-center gap-2 rounded-lg border px-2 py-1 text-xs ${toneClass(r.tone)}`}>
                                    <span>{r.label}</span>
                                    <span className="opacity-80">• {r.score}</span>
                                </div>
                            );
                        })()}

                        {/* mini sparkline placeholder par carte */}
                        <div className="mt-3 h-10 rounded-md border border-white/10 bg-gradient-to-b from-white/10 to-transparent" />
                    </article>
                ))}
            </div>
        </div>
    );
}
