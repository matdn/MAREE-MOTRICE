"use client";
import { useMemo, useRef, useState } from "react";

type Props = {
    times: string[];
    values: number[];
    unit?: string;
    title?: string;
    className?: string;
};

export default function TideChart({
    times,
    values,
    unit = "m",
    title = "Marées — 24h",
    className = "block h-44 sm:h-56",
}: Props) {
    const VBW = 1000;
    const VBH = 220;
    const PADX = 10;
    const PADY = 14;
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [tip, setTip] = useState<{ show: boolean; x: number; y: number; v: number; t: string; }>({
        show: false,
        x: 0,
        y: 0,
        v: 0,
        t: "",
    });

    const stats = useMemo(() => {
        if (!values?.length) return { lo: 0, hi: 0, avg: 0 };
        const lo = Math.min(...values);
        const hi = Math.max(...values);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        return { lo, hi, avg };
    }, [values]);

    const gridIdx = useMemo(() => {
        const out: number[] = [];
        for (let i = 0; i < times.length; i += 6) out.push(i);
        return out;
    }, [times]);

    const extrema = useMemo(() => {
        const highs: number[] = [];
        const lows: number[] = [];
        for (let i = 1; i < values.length - 1; i++) {
            const a = values[i - 1];
            const b = values[i];
            const c = values[i + 1];
            if (b > a && b >= c) highs.push(i);
            if (b < a && b <= c) lows.push(i);
        }
        return { highs, lows };
    }, [values]);

    const barW = useMemo(() => (values.length ? VBW / (values.length * 1.6) : 0), [values]);
    const scaleY = (v: number) => {
        if (stats.hi === stats.lo) return (VBH - 2 * PADY) * 0.5;
        return ((v - stats.lo) / (stats.hi - stats.lo)) * (VBH - 2 * PADY);
    };

    const firstTime = times[0] ? new Date(times[0]).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    const lastTime = times[times.length - 1]
        ? new Date(times[times.length - 1]).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "";

    const onEnter = (i: number, e: React.MouseEvent<SVGRectElement>) => {
        const rect = containerRef.current?.getBoundingClientRect();
        const cx = (e.clientX ?? 0) - (rect?.left ?? 0);
        const cy = (e.clientY ?? 0) - (rect?.top ?? 0);
        setTip({
            show: true,
            x: cx,
            y: cy,
            v: values[i],
            t: new Date(times[i]).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
    };
    const onMove = (i: number, e: React.MouseEvent<SVGRectElement>) => onEnter(i, e);
    const onLeave = () => setTip((t) => ({ ...t, show: false }));

    if (!values?.length || !times?.length) {
        return (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                Données insuffisantes pour tracer le graphique.
            </div>
        );
    }

    return (
        <div className="relative" ref={containerRef}>
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="text-sm font-medium">{title}</div>
                    <div className="text-xs text-white/60">
                        min {stats.lo.toFixed(2)} {unit} • moy {stats.avg.toFixed(2)} {unit} • max {stats.hi.toFixed(2)} {unit}
                    </div>
                </div>
                <div className="text-xs text-white/60">{firstTime} — {lastTime}</div>
            </div>

            <div className="w-full">
                <svg
                    viewBox={`0 0 ${VBW} ${VBH}`}
                    width="100%"
                    height="100%"
                    preserveAspectRatio="none"
                    className={className}
                >
                    <defs>
                        <linearGradient id="tideBar" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="white" stopOpacity="1" />
                            <stop offset="100%" stopColor="white" stopOpacity="0.35" />
                        </linearGradient>
                        <linearGradient id="bgFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="white" stopOpacity="0.10" />
                            <stop offset="100%" stopColor="white" stopOpacity="0.02" />
                        </linearGradient>
                    </defs>

                    <rect x="0" y="0" width={VBW} height={VBH} fill="url(#bgFill)" rx="12" />

                    {gridIdx.map((i) => {
                        const x = values.length === 1 ? VBW / 2 : PADX + (i / (values.length - 1)) * (VBW - 2 * PADX);
                        return <line key={`g-${i}`} x1={x} y1={PADY} x2={x} y2={VBH - PADY} stroke="currentColor" opacity="0.12" />;
                    })}

                    <line x1={PADX} x2={VBW - PADX} y1={VBH - PADY} y2={VBH - PADY} stroke="currentColor" opacity="0.15" />

                    {values.map((v, i) => {
                        const h = scaleY(v);
                        const x = i * (barW * 1.6) + PADX;
                        const y = VBH - PADY - h;
                        return (
                            <rect
                                key={i}
                                x={x}
                                y={y}
                                width={barW}
                                height={h}
                                fill="url(#tideBar)"
                                rx="4"
                                onMouseEnter={(e) => onEnter(i, e)}
                                onMouseMove={(e) => onMove(i, e)}
                                onMouseLeave={onLeave}
                            />
                        );
                    })}

                    {extrema.highs.slice(0, 4).map((i) => {
                        const h = scaleY(values[i]);
                        const x = i * (barW * 1.6) + PADX + barW / 2;
                        const y = VBH - PADY - h;
                        return (
                            <g key={`H-${i}`} opacity={0.95}>
                                <circle cx={x} cy={y - 10} r={10} fill="white" opacity="0.16" />
                                <circle cx={x} cy={y - 10} r={3.5} fill="white" />
                            </g>
                        );
                    })}

                    {extrema.lows.slice(0, 4).map((i) => {
                        const h = scaleY(values[i]);
                        const x = i * (barW * 1.6) + PADX + barW / 2;
                        const y = VBH - PADY - h;
                        return (
                            <g key={`L-${i}`} opacity={0.95}>
                                <circle cx={x} cy={y + 10} r={10} fill="white" opacity="0.12" />
                                <circle cx={x} cy={y + 10} r={3.5} fill="white" />
                            </g>
                        );
                    })}
                </svg>
            </div>

            {tip.show && (
                <div
                    className="pointer-events-none absolute z-10 rounded-md bg-black/70 px-2 py-1 text-xs text-white shadow-lg backdrop-blur"
                    style={{
                        left: Math.min(Math.max(tip.x + 8, 8), (containerRef.current?.clientWidth ?? 0) - 8),
                        top: Math.max(tip.y - 32, 8),
                    }}
                >
                    {tip.t} • {tip.v.toFixed(2)} {unit}
                </div>
            )}
        </div>
    );
}
