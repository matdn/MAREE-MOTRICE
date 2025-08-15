"use client";
import { useMemo, useRef, useState } from "react";

function Chart24hBars({
    times,
    values,
    unit,
    className = "block h-44 sm:h-56",
}: {
    times: string[];
    values: number[];
    unit: string;
    className?: string;
}) {
    const VBW = 1000;
    const VBH = 180;
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [tip, setTip] = useState<{ show: boolean; x: number; y: number; v: number; t: string; }>(
        { show: false, x: 0, y: 0, v: 0, t: "" }
    );

    const stats = useMemo(() => {
        if (!values.length) return { lo: 0, hi: 0, min: 0, max: 0, avg: 0 };
        const lo = Math.min(...values);
        const hi = Math.max(...values);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        return { lo, hi, min: lo, max: hi, avg };
    }, [values]);

    const barW = useMemo(() => (values.length ? VBW / (values.length * 1.5) : 0), [values]);
    const scaleY = (v: number) => {
        if (stats.hi === stats.lo) return 0;
        return ((v - stats.lo) / (stats.hi - stats.lo)) * (VBH - 20);
    };

    const handleEnter = (i: number, e: React.MouseEvent<SVGRectElement>) => {
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
    const handleMove = (i: number, e: React.MouseEvent<SVGRectElement>) => handleEnter(i, e);
    const handleLeave = () => setTip((t) => ({ ...t, show: false }));

    const firstTime = times[0] ? new Date(times[0]).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    const lastTime = times[times.length - 1]
        ? new Date(times[times.length - 1]).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "";

    return (
        <div className="relative" ref={containerRef}>
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="text-sm font-medium">Hauteur de houle — 24h</div>
                    <div className="text-xs text-white/60">
                        min {stats.min.toFixed(1)} {unit} • moy {stats.avg.toFixed(1)} {unit} • max {stats.hi.toFixed(1)} {unit}
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
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="white" stopOpacity="1" />
                            <stop offset="100%" stopColor="white" stopOpacity="0.3" />
                        </linearGradient>
                    </defs>

                    {values.map((v, i) => {
                        const h = scaleY(v);
                        const x = i * (barW * 1.5) + 10;
                        const y = VBH - h - 10;
                        return (
                            <rect
                                key={i}
                                x={x}
                                y={y}
                                width={barW}
                                height={h}
                                fill="url(#barGrad)"
                                rx="4"
                                onMouseEnter={(e) => handleEnter(i, e)}
                                onMouseMove={(e) => handleMove(i, e)}
                                onMouseLeave={handleLeave}
                            />
                        );
                    })}
                </svg>
            </div>

            {tip.show && (
                <div
                    className="pointer-events-none absolute z-10 rounded-md bg-black/70 px-2 py-1 text-xs text-white shadow-lg backdrop-blur"
                    style={{ left: Math.min(Math.max(tip.x + 8, 8), (containerRef.current?.clientWidth ?? 0) - 8), top: Math.max(tip.y - 32, 8) }}
                >
                    {tip.t} • {tip.v.toFixed(2)} {unit}
                </div>
            )}
        </div>
    );
}

export default Chart24hBars;