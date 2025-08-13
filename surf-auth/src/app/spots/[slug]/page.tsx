import { findBySlug, spotSlug } from "@/app/datas/spots";
import { notFound } from "next/navigation";
import WeeklyForecast from "./WeeklyForecast";

type Marine = {
    hourly?: {
        time: string[];
        wave_height?: number[];
        wave_direction?: number[];
        wave_period?: number[];
        wind_wave_peak_period?: number[];
    };
    hourly_units?: {
        wave_height?: string;
        wave_direction?: string;
        wave_period?: string;
        wind_wave_peak_period?: string;
    };
};

function compass(d?: number) {
    if (d == null || Number.isNaN(d)) return "-";
    const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    return dirs[Math.round(d / 22.5) % 16];
}

function nearestIdx(times: string[]) {
    const now = Date.now();
    let best = 0, diff = Infinity;
    for (let i = 0; i < times.length; i++) {
        const t = new Date(times[i]).getTime();
        const d = Math.abs(t - now);
        if (d < diff) { diff = d; best = i; }
    }
    return best;
}

type DaySummary = {
    dateISO: string;
    label: string;
    heightMax?: number;
    periodMax?: number;
    dirAvg?: number;
    dirTxt: string;
    windWavePeakMax?: number;
};

function sliceNextHours<T>(times: string[], series: T[], startIdx: number, count = 24) {
    const end = Math.min(times.length, startIdx + count);
    return { times: times.slice(startIdx, end), values: series.slice(startIdx, end) as number[] };
}

// Construit un path en coordonnées normalisées (viewBox), + points, + stats.
function buildSparkPathResponsive(values: number[], W = 1000, H = 180, pad = 10) {
    if (!values.length) return { d: "", min: 0, max: 0, avg: 0, pts: [] as { x: number; y: number; }[], lo: 0, hi: 0 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const lo = min - (max - min) * 0.15; // padding vertical
    const hi = max + (max - min) * 0.10;

    const nx = (i: number) => (values.length === 1 ? W / 2 : (i / (values.length - 1)) * (W - pad * 2) + pad);
    const ny = (v: number) => {
        if (hi === lo) return H / 2;
        const t = (v - lo) / (hi - lo);
        return (1 - t) * (H - pad * 2) + pad;
    };

    const pts: { x: number; y: number; }[] = values.map((v, i) => ({ x: nx(i), y: ny(v) }));
    const d = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
    return { d, min, max, avg, pts, lo, hi };
}


function summarizeWeek(data: Marine | null): DaySummary[] {
    if (!data?.hourly?.time?.length) return [];
    const { time, wave_height, wave_direction, wave_period, wind_wave_peak_period } = data.hourly;

    // Regrouper par YYYY-MM-DD
    const buckets = new Map<string, number[]>(); // map date -> indices
    for (let i = 0; i < time.length; i++) {
        const d = new Date(time[i]);
        const key = d.toISOString().slice(0, 10);
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key)!.push(i);
    }

    // Garder les 7 prochains jours à partir d'aujourd’hui
    const todayKey = new Date().toISOString().slice(0, 10);
    const keys = Array.from(buckets.keys()).sort().filter(k => k >= todayKey).slice(0, 7);

    const days: DaySummary[] = keys.map((key) => {
        const idxs = buckets.get(key)!;

        const h = (arr?: number[]) => (arr && arr.length ? Math.max(...arr) : undefined);
        const pick = (arr?: number[]) => (arr ? idxs.map(i => arr[i]).filter(v => typeof v === "number" && !Number.isNaN(v)) : []);

        const heights = pick(wave_height);
        const periods = pick(wave_period);
        const dirs = pick(wave_direction);
        const wwp = pick(wind_wave_peak_period);

        // direction moyenne “circulaire” soft : moyenne simple (suffisant pour une tendance)
        const dirAvg = dirs.length ? (dirs.reduce((a, b) => a + b, 0) / dirs.length) : undefined;

        const dateObj = new Date(`${key}T00:00:00`);
        const label = dateObj.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" });

        return {
            dateISO: key,
            label,
            heightMax: heights.length ? Math.max(...heights) : undefined,
            periodMax: periods.length ? Math.max(...periods) : undefined,
            dirAvg,
            dirTxt: compass(dirAvg),
            windWavePeakMax: wwp.length ? Math.max(...wwp) : undefined,
        };
    });

    return days;
}

export default async function Page({ params }: { params: { slug: string; }; }) {
    const spot = findBySlug(params.slug);
    if (!spot) notFound();

    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${spot.lat}&longitude=${spot.lon}&hourly=wave_height,wave_direction,wave_period,wind_wave_peak_period&timezone=auto`;
    const res = await fetch(url, { next: { revalidate: 600 } });
    const ct = res.headers.get("content-type") || "";
    const data: Marine | null = ct.includes("application/json") ? await res.json() : null;

    const i = data?.hourly?.time?.length ? nearestIdx(data.hourly.time) : -1;
    const wh = i >= 0 ? data?.hourly?.wave_height?.[i] : undefined;
    const wp = i >= 0 ? data?.hourly?.wave_period?.[i] : undefined;
    const wd = i >= 0 ? data?.hourly?.wave_direction?.[i] : undefined;
    const wpp = i >= 0 ? data?.hourly?.wind_wave_peak_period?.[i] : undefined;
    const units = {
        wh: data?.hourly_units?.wave_height || "m",
        wp: data?.hourly_units?.wave_period || "s",
        wd: data?.hourly_units?.wave_direction || "°",
        wpp: data?.hourly_units?.wind_wave_peak_period || "s",
    };
    const when = i >= 0 && data?.hourly?.time ? new Date(data.hourly.time[i]).toLocaleString() : "—";

    const week = summarizeWeek(data);

    return (
        <main className="relative min-h-dvh overflow-hidden bg-black text-white">
            {/* BG effets */}
            <div className="pointer-events-none absolute inset-0">
                <div className="blob-bg absolute h-[42rem] w-[42rem] rounded-full blur-[70px] opacity-30 mix-blend-screen animate-[var(--animate-float)]" style={{ top: "-12%", left: "-10%" }} />
                <div className="blob-bg absolute h-[36rem] w-[36rem] rounded-full blur-[70px] opacity-20 mix-blend-screen animate-[var(--animate-float)]" style={{ bottom: "-18%", right: "-18%" }} />
                <div className="grain-bg absolute -inset-[100%] mix-blend-soft-light animate-[var(--animate-grain)]" />
            </div>

            <section className="relative z-10 mx-auto max-w-5xl px-6 py-10">
                {/* Titre & meta */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight">{spot.name}</h1>
                        <p className="text-sm text-white/60">{spot.city} • {spot.lat.toFixed(4)}, {spot.lon.toFixed(4)}</p>
                    </div>
                    <a href="/" className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15">Retour</a>
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-4">
                    {/* NOW */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:col-span-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-medium">Maintenant</h2>
                            <span className="text-xs text-white/60">{when}</span>
                        </div>
                        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                                <div className="text-xs uppercase tracking-wider text-white/60">Hauteur</div>
                                <div className="mt-1 text-2xl font-semibold">{wh != null ? `${wh.toFixed(2)} ${units.wh}` : "—"}</div>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                                <div className="text-xs uppercase tracking-wider text-white/60">Période</div>
                                <div className="mt-1 text-2xl font-semibold">{wp != null ? `${Math.round(wp)} ${units.wp}` : "—"}</div>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                                <div className="text-xs uppercase tracking-wider text-white/60">Direction</div>
                                <div className="mt-1 text-2xl font-semibold">{wd != null ? `${Math.round(wd)}° ${compass(wd)}` : "—"}</div>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                                <div className="text-xs uppercase tracking-wider text-white/60">Pic vagues de vent</div>
                                <div className="mt-1 text-2xl font-semibold">{wpp != null ? `${Math.round(wpp)} ${units.wpp}` : "—"}</div>
                            </div>
                        </div>

                        {/* Placeholder chart area */}
                        {/* Sparkline – Hauteur de houle (24h) – responsive */}
                        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
                            {(() => {
                                const idx = data?.hourly?.time?.length ? nearestIdx(data.hourly.time) : -1;
                                const { times, values } =
                                    idx >= 0 && data?.hourly?.wave_height
                                        ? sliceNextHours(data.hourly.time, data.hourly.wave_height, idx, 24)
                                        : { times: [], values: [] };

                                // ViewBox: s’adapte à la largeur via width="100%" + preserveAspectRatio
                                const VBW = 1000;
                                const VBH = 180;
                                const { d, min, max, avg, pts, lo, hi } = buildSparkPathResponsive(values, VBW, VBH, 10);

                                // repères verticales toutes les 6h
                                const gridIdx: number[] = [];
                                for (let i = 0; i < times.length; i += 6) gridIdx.push(i);

                                const ny = (v: number) => {
                                    if (hi === lo) return VBH / 2;
                                    const t = (v - lo) / (hi - lo);
                                    return (1 - t) * (VBH - 20) + 10;
                                };
                                const yAvg = ny(avg);

                                return values.length ? (
                                    <div className="relative">
                                        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                                            <div>
                                                <div className="text-sm font-medium">Hauteur de houle — 24h</div>
                                                <div className="text-xs text-white/60">
                                                    min {min.toFixed(1)} {units.wh} • moy {avg.toFixed(1)} {units.wh} • max {max.toFixed(1)} {units.wh}
                                                </div>
                                            </div>
                                            <div className="text-xs text-white/60">
                                                {new Date(times[0]).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} —{" "}
                                                {new Date(times[times.length - 1]).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </div>
                                        </div>

                                        {/* SVG fluide : largeur 100%, hauteur responsive via classes Tailwind */}
                                        <div className="w-full">
                                            <svg
                                                viewBox={`0 0 ${VBW} ${VBH}`}
                                                width="100%"
                                                height="100%"
                                                preserveAspectRatio="none"
                                                className="block h-44 sm:h-56"
                                            >
                                                <defs>
                                                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="white" stopOpacity="1" />
                                                        <stop offset="100%" stopColor="white" stopOpacity="0.3" />
                                                    </linearGradient>
                                                    <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="white" stopOpacity="0.20" />
                                                        <stop offset="100%" stopColor="white" stopOpacity="0.03" />
                                                    </linearGradient>
                                                </defs>

                                                {/* fond */}
                                                <rect x="0" y="0" width={VBW} height={VBH} fill="url(#fillGrad)" rx="12" />

                                                {/* grille verticale (toutes les 6h) */}
                                                {gridIdx.map((i) => {
                                                    const x = pts.length === 1 ? VBW / 2 : (i / (pts.length - 1)) * (VBW - 20) + 10;
                                                    return <line key={i} x1={x} y1={8} x2={x} y2={VBH - 8} stroke="currentColor" opacity="0.12" />;
                                                })}

                                                {/* ligne moyenne */}
                                                {values.length > 1 && <line x1={10} x2={VBW - 10} y1={yAvg} y2={yAvg} stroke="currentColor" opacity="0.2" strokeDasharray="4 4" />}

                                                {/* courbe */}
                                                <path d={d} fill="none" stroke="url(#lineGrad)" strokeWidth={22} strokeLinejoin="round" strokeLinecap="round" />

                                                {/* points min / max */}
                                                {values.length > 1 && (() => {
                                                    const minIdx = values.indexOf(min);
                                                    const maxIdx = values.indexOf(max);
                                                    const pMin = pts[minIdx];
                                                    const pMax = pts[maxIdx];
                                                    return (
                                                        <>
                                                            <circle cx={pMin.x} cy={pMin.y} r={16} fill="white" opacity="0.08" />
                                                            <circle cx={pMin.x} cy={pMin.y} r={4} fill="white" opacity="0.7" />
                                                            <circle cx={pMax.x} cy={pMax.y} r={16} fill="white" opacity="0.12" />
                                                            <circle cx={pMax.x} cy={pMax.y} r={4} fill="white" />
                                                        </>
                                                    );
                                                })()}
                                            </svg>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-40 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                                        Données insuffisantes pour tracer le graphique.
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* META */}
                    {/* <aside className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                        <h3 className="text-lg font-medium">Meta</h3>
                        <div className="mt-4 space-y-3 text-sm">
                            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                                <span className="text-white/60">Slug</span>
                                <span className="font-mono text-xs">{spotSlug(spot)}</span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                                <span className="text-white/60">Fuseau</span>
                                <span className="text-xs">auto</span>
                            </div>
                            <a
                                className="mt-2 block rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-center text-sm hover:bg-white/15"
                                href={`https://marine-api.open-meteo.com/v1/marine?latitude=${spot.lat}&longitude=${spot.lon}&hourly=wave_height,wave_direction,wave_period,wind_wave_peak_period&timezone=auto`}
                                target="_blank"
                            >
                                Ouvrir l’API brute
                            </a>
                        </div>
                    </aside> */}
                </div>

                <WeeklyForecast
                    week={week as DaySummary[]}
                    units={{ wh: units.wh, wp: units.wp, wpp: units.wpp }}
                />
            </section>
        </main>
    );
}
