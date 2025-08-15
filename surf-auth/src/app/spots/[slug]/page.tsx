import { findBySlug } from "@/app/datas/spots";
import { notFound } from "next/navigation";
import WeeklyForecast from "./WeeklyForecast";
import Chart24hBars from "@/app/components/Chart24hBars";
import TideChart from "@/app/components/TideChart";

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

type TideBlock = { time: string[]; tide_height: number[]; };
type MarineHourly = {
    time: string[];
    wave_height?: number[];
    wave_direction?: number[];
    wave_period?: number[];
    wind_wave_peak_period?: number[];
};
type MarineResponse = { hourly: MarineHourly; tide?: TideBlock; };

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

export default async function Page(
    { params }: { params: Promise<{ slug: string; }>; }
) {
    const { slug } = await params;
    const spot = findBySlug(slug);
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

                <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
                    {(() => {
                        const t = (data as MarineResponse)?.tide;
                        const { times, values } = t?.time?.length
                            ? sliceNextHours(t.time, t.tide_height, 0, 24)
                            : { times: [], values: [] };
                        return values.length ? (
                            <TideChart times={times} values={values} unit="m" />
                        ) : (
                            <div className="h-40 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                                Données insuffisantes pour tracer le graphique.
                            </div>
                        );
                    })()}
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-1">
                    {/* NOW */}
                    {/* Graphique vertical (bar chart) */}


                    <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
                        {(() => {
                            const idx = data?.hourly?.time?.length ? nearestIdx(data.hourly.time) : -1;
                            const { times, values } =
                                idx >= 0 && data?.hourly?.wave_height
                                    ? sliceNextHours(data.hourly.time, data.hourly.wave_height, idx, 24)
                                    : { times: [], values: [] };

                            return values.length ? (
                                <Chart24hBars times={times} values={values} unit={units.wh} />
                            ) : (
                                <div className="h-40 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                                    Données insuffisantes pour tracer le graphique.
                                </div>
                            );
                        })()}
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
