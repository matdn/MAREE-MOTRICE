"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Spot, spots, spotSlug } from "./datas/spots";

type Me = { authenticated: boolean; email?: string; } | null;

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


type Theme = "dark" | "light";

const [theme, setTheme] = useState<Theme>(() => {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem("theme");
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
});

useLayoutEffect(() => {
  localStorage.setItem("theme", theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
}, [theme]);


type Lang = "fr" | "en";

const I18N: Record<Lang, Record<string, string>> = {
  fr: {
    app: "Surf Report",
    today: "Aujourd’hui",
    place: "Carnac, Bretagne",
    search_placeholder: "Rechercher une plage ou un spot…",
    go: "Aller",
    login: "Connexion",
    register: "Inscription",
    logout: "Déconnexion",
    loading: "Chargement…",
    session: "Session",
    status: "Statut",
    logged_in: "Connecté",
    email: "Email",
    quick_metrics: "Indicateurs",
    checklist: "Checklist",
    wetsuit: "Combinaison 3/2 mm",
    leash: "Leash",
    wax: "Wax",
    nearby: "Spots à proximité",
    swell_wind: "Houle & Vent",
    next12h: "Prochaines 12 h",
    tides: "Marées",
    today_small: "Aujourd’hui",
    wave_height: "Hauteur",
    period: "Période",
    direction: "Direction",
    wind_wave_peak: "Période vagues de vent",
    primary_swell: "Houle principale",
    peak_period: "Période de pic",
    mean_direction: "Direction moyenne",
    sea_state: "État de mer",
    dir_now: "Dir. actuelle",
    period_max: "Période max",
    waveht_max: "Haut. max",
    windwavepk: "Pic vagues de vent",
    favourites: "Favoris",
    add_fav: "Ajouter aux favoris",
    remove_fav: "Retirer des favoris",
    theme: "Thème",
    language: "Langue",
  },
  en: {
    app: "Surf Report",
    today: "Today",
    place: "Carnac, Brittany",
    search_placeholder: "Search a beach or spot…",
    go: "Go",
    login: "Login",
    register: "Register",
    logout: "Logout",
    loading: "Loading…",
    session: "Session",
    status: "Status",
    logged_in: "Logged in",
    email: "Email",
    quick_metrics: "Quick Metrics",
    checklist: "Checklist",
    wetsuit: "Wetsuit 3/2 mm",
    leash: "Leash",
    wax: "Wax",
    nearby: "Nearby Spots",
    swell_wind: "Swell & Wind",
    next12h: "Next 12 hours",
    tides: "Tides",
    today_small: "Today",
    wave_height: "Wave height",
    period: "Period",
    direction: "Direction",
    wind_wave_peak: "Wind wave peak",
    primary_swell: "Primary swell",
    peak_period: "Peak period",
    mean_direction: "Mean direction",
    sea_state: "Sea state",
    dir_now: "Dir now",
    period_max: "Period max",
    waveht_max: "Wave Ht max",
    windwavepk: "WindWavePk",
    favourites: "Favourites",
    add_fav: "Add to favourites",
    remove_fav: "Remove from favourites",
    theme: "Theme",
    language: "Language",
  },
};

function compass(d: number | undefined) {
  if (d == null || isNaN(d)) return "-";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(d / 22.5) % 16];
}
function nearestIdx(times: string[]) {
  if (!times?.length) return -1;
  const now = Date.now();
  let best = 0, bestDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    const t = new Date(times[i]).getTime();
    const diff = Math.abs(t - now);
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  }
  return best;
}

export default function Home() {
  const router = useRouter();

  // --- UI prefs
  const [lang, setLang] = useState<Lang>(() => (typeof window !== "undefined" ? ((localStorage.getItem("lang") as Lang) || "fr") : "fr"));
  const [theme, setTheme] = useState<Theme>(() => (typeof window !== "undefined" ? ((localStorage.getItem("theme") as Theme) || "dark") : "dark"));

  // --- Session & data
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);
  const [marine, setMarine] = useState<Marine | null>(null);

  // --- Search & favourites
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [favs, setFavs] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("favs") || "[]"); } catch { return []; }
  });

  // Accent-insensitive filter
  const results = useMemo<Spot[]>(() => {
    if (!q.trim()) return [];
    const n = q.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return spots.filter((s: Spot) => {
      const a = `${s.name} ${s.city}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      return a.includes(n);
    }).slice(0, 8);
  }, [q]);

  const t = I18N[lang];

  const palette = theme === "dark"
    ? {
      page: "bg-black text-white",
      border: "border-white/10",
      card: "bg-white/5",
      hover: "hover:bg-white/15",
      sub: "text-white/60",
      border20: "border-white/20",
      inputBorder: "border-white/15",
      suggestBg: "bg-black/70",
      mix: "mix-blend-screen",
      grainMix: "mix-blend-soft-light",
    }
    : {
      page: "bg-white text-black",
      border: "border-black/10",
      card: "bg-black/5",
      hover: "hover:bg-black/10",
      sub: "text-black/60",
      border20: "border-black/20",
      inputBorder: "border-black/15",
      suggestBg: "bg-white/90",
      mix: "mix-blend-multiply",
      grainMix: "mix-blend-multiply",
    };

  function goToSpot(slug: string) {
    setOpen(false);
    router.push(`/spots/${slug}`);
  }
  function toggleFav(slug: string) {
    setFavs(prev => {
      const next = prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug];
      localStorage.setItem("favs", JSON.stringify(next));
      return next;
    });
  }

  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);
  useEffect(() => {
    localStorage.setItem("theme", theme);
    // optionnel: appliquer une classe globale pour d’autres styles
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    (async () => {
      try {
        const [meRes, marineRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("https://marine-api.open-meteo.com/v1/marine?latitude=47.5986&longitude=-3.1144&hourly=wave_height,wave_direction,wave_period,wind_wave_peak_period&timezone=auto"),
        ]);
        const meCt = meRes.headers.get("content-type") || "";
        const meJson = meCt.includes("application/json") ? await meRes.json() : { authenticated: false };
        setMe(meJson);
        const mCt = marineRes.headers.get("content-type") || "";
        const mJson: Marine | null = mCt.includes("application/json") ? await marineRes.json() : null;
        setMarine(mJson);
      } catch {
        setMe({ authenticated: false });
        setMarine(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const nowData = useMemo(() => {
    if (!marine?.hourly?.time) return null;
    const i = nearestIdx(marine.hourly.time);
    if (i < 0) return null;
    const wh = marine.hourly.wave_height?.[i];
    const wp = marine.hourly.wave_period?.[i];
    const wd = marine.hourly.wave_direction?.[i];
    const wpp = marine.hourly.wind_wave_peak_period?.[i];
    return {
      time: marine.hourly.time[i],
      waveHeight: wh,
      wavePeriod: wp,
      waveDirDeg: wd,
      waveDirTxt: compass(wd),
      windWavePeakPeriod: wpp,
      units: {
        waveHeight: marine.hourly_units?.wave_height || "m",
        wavePeriod: marine.hourly_units?.wave_period || "s",
        waveDir: marine.hourly_units?.wave_direction || "°",
        windWavePeakPeriod: marine.hourly_units?.wind_wave_peak_period || "s",
      },
    };
  }, [marine]);

  const favSpots: Spot[] = useMemo(
    () => spots.filter((s) => favs.includes(spotSlug(s))),
    [favs]
  );

  // util: blob gradient dépendant du thème
  const blobStyle = {
    background:
      theme === "dark"
        ? "radial-gradient(60% 60% at 50% 50%, #fff 0%, rgba(255,255,255,0.25) 45%, rgba(255,255,255,0) 70%)"
        : "radial-gradient(60% 60% at 50% 50%, #000 0%, rgba(0,0,0,0.18) 45%, rgba(0,0,0,0) 70%)",
  } as React.CSSProperties;

  return (
    <main className={`relative min-h-dvh overflow-hidden ${palette.page}`}>
      {/* Blobs + grain */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className={`absolute h-[42rem] w-[42rem] rounded-full blur-[70px] opacity-30 ${palette.mix} animate-[var(--animate-float)]`}
          style={{ top: "-12%", left: "-10%", animationDelay: "0s", ...blobStyle }}
        />
        <div
          className={`absolute h-[42rem] w-[42rem] rounded-full blur-[70px] opacity-30 ${palette.mix} animate-[var(--animate-float)]`}
          style={{ bottom: "-18%", right: "-18%", animationDelay: "3s", ...blobStyle }}
        />
        <div
          className={`absolute h-[36rem] w-[36rem] rounded-full blur-[70px] opacity-20 ${palette.mix} animate-[var(--animate-float)]`}
          style={{ top: "30%", right: "6%", animationDelay: "6s", ...blobStyle }}
        />
        <div className={`absolute -inset-[100%] ${palette.grainMix} animate-[var(--animate-grain)] grain-bg`} />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-xl border ${palette.border20} ${palette.card} backdrop-blur`} />
          <span className="text-sm tracking-wide">{t.app}</span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          {/* Lang & Theme */}
          <div className={`flex items-center gap-2 rounded-lg border ${palette.border} ${palette.card} px-2 py-1 backdrop-blur`}>
            <button
              onClick={() => setLang(lang === "fr" ? "en" : "fr")}
              className={`rounded-md border ${palette.border20} ${palette.card} px-2 py-1 ${palette.hover}`}
              aria-label={t.language}
              title={t.language}
            >
              {lang.toUpperCase()}
            </button>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`rounded-md border ${palette.border20} ${palette.card} px-2 py-1 ${palette.hover}`}
              aria-label={t.theme}
              title={t.theme}
            >
              {theme === "dark" ? "🌙" : "☀️"}
            </button>
          </div>

          {/* Session */}
          {loading ? (
            <span className={`${palette.sub}`}>{t.loading}</span>
          ) : me?.authenticated ? (
            <div className="flex items-center gap-3">
              <span className="opacity-80">{me.email}</span>
              <button
                onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); location.reload(); }}
                className={`rounded-lg border ${palette.border20} ${palette.card} px-3 py-1.5 ${palette.hover}`}
              >
                {t.logout}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <a href="/login" className={`rounded-lg border ${palette.border20} ${palette.card} px-3 py-1.5 ${palette.hover}`}>{t.login}</a>
              <a href="/register" className={`rounded-lg border ${palette.border20} ${palette.card} px-3 py-1.5 ${palette.hover}`}>{t.register}</a>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <section className="relative z-10 px-6 pb-10">
        <div className="mx-auto grid w-full max-w-6xl gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            {/* Today + Search */}
            <div className={`rounded-2xl border ${palette.border} ${palette.card} p-6 backdrop-blur-xl`}>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">{t.today}</h1>
                  <p className={`text-sm ${palette.sub}`}>{t.place} • {nowData?.time ? new Date(nowData.time).toLocaleString() : "—"}</p>
                </div>

                {/* Search */}
                <div className="relative w-full max-w-md">
                  <div className={`flex items-center gap-2 rounded-2xl border ${palette.inputBorder} ${palette.card} px-4 py-3 backdrop-blur`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-70">
                      <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5A6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79L20 21.49L21.49 20zM9.5 14A4.5 4.5 0 1 1 14 9.5A4.505 4.505 0 0 1 9.5 14" />
                    </svg>
                    <input
                      ref={inputRef}
                      value={q}
                      onChange={(e) => { setQ(e.target.value); setOpen(true); }}
                      onFocus={() => { if (results.length) setOpen(true); }}
                      onBlur={() => setTimeout(() => setOpen(false), 120)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (results[0]) goToSpot(spotSlug(results[0]));
                        } else if (e.key === "Escape") {
                          setOpen(false);
                        }
                      }}
                      placeholder={t.search_placeholder}
                      className="h-10 w-full bg-transparent outline-none placeholder-opacity-70"
                    />
                    <button
                      onClick={() => {
                        if (results[0]) goToSpot(spotSlug(results[0]));
                        else inputRef.current?.focus();
                      }}
                      className={`rounded-lg border ${palette.border20} ${palette.card} px-3 py-1.5 text-sm ${palette.hover}`}
                    >
                      {t.go}
                    </button>
                  </div>

                  {open && results.length > 0 && (
                    <div className={`absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border ${palette.border} ${palette.suggestBg} backdrop-blur-xl`}>
                      {results.map((s: Spot, i: number) => {
                        const slug = spotSlug(s);
                        const isFav = favs.includes(slug);
                        return (
                          <div key={i} className="flex w-full items-stretch">
                            <button
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => goToSpot(slug)}
                              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/5"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{s.name}</span>
                                <span className={`text-xs ${palette.sub}`}>{s.city}</span>
                              </div>
                              <span className={`text-xs ${palette.sub}`}>
                                {s.lat.toFixed(3)}, {s.lon.toFixed(3)}
                              </span>
                            </button>
                            <button
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => toggleFav(slug)}
                              className={`px-3 text-lg ${palette.hover}`}
                              title={isFav ? t.remove_fav : t.add_fav}
                              aria-label={isFav ? t.remove_fav : t.add_fav}
                            >
                              {isFav ? "★" : "☆"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard palette={palette} title={t.wave_height} value={nowData?.waveHeight != null ? `${nowData.waveHeight.toFixed(2)} ${nowData.units.waveHeight}` : "—"} hint={t.primary_swell} />
                <StatCard palette={palette} title={t.period} value={nowData?.wavePeriod != null ? `${Math.round(nowData.wavePeriod)} ${nowData.units.wavePeriod}` : "—"} hint={t.peak_period} />
                <StatCard palette={palette} title={t.direction} value={nowData?.waveDirDeg != null ? `${Math.round(nowData.waveDirDeg)}° ${nowData.waveDirTxt}` : "—"} hint={t.mean_direction} />
                <StatCard palette={palette} title={t.wind_wave_peak} value={nowData?.windWavePeakPeriod != null ? `${Math.round(nowData.windWavePeakPeriod)} ${nowData.units.windWavePeakPeriod}` : "—"} hint={t.sea_state} />
              </div>
            </div>

            {/* Swell/Wind + Tides */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className={`rounded-2xl border ${palette.border} ${palette.card} p-6 backdrop-blur-xl`}>
                <h2 className="text-lg font-medium">{t.swell_wind}</h2>
                <p className={`text-xs ${palette.sub}`}>{t.next12h}</p>
                <div className={`mt-4 h-48 rounded-xl border ${palette.border} bg-gradient-to-b from-white/10 to-transparent`} />
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <Badge palette={palette} label={nowData?.waveHeight != null && nowData?.wavePeriod != null ? `Primary: ${nowData.waveHeight.toFixed(1)}${nowData.units.waveHeight} @ ${Math.round(nowData.wavePeriod)}${nowData.units.wavePeriod} ${nowData.waveDirTxt}` : "Primary: —"} />
                  <Badge palette={palette} label={nowData?.windWavePeakPeriod != null ? `Wind wave peak: ${Math.round(nowData.windWavePeakPeriod)}${nowData.units.windWavePeakPeriod}` : "Wind wave peak: —"} />
                  <Badge palette={palette} label={nowData?.waveDirDeg != null ? `Dir: ${Math.round(nowData.waveDirDeg)}°` : "Dir: —"} />
                </div>
              </div>

              <div className={`rounded-2xl border ${palette.border} ${palette.card} p-6 backdrop-blur-xl`}>
                <h2 className="text-lg font-medium">{t.tides}</h2>
                <p className={`text-xs ${palette.sub}`}>{t.today_small}</p>
                <div className="mt-4 space-y-3 text-sm">
                  <Row palette={palette} k="Low" v="—" />
                  <Row palette={palette} k="High" v="—" />
                  <Row palette={palette} k="Low" v="—" />
                </div>
                <div className={`mt-5 h-32 rounded-xl border ${palette.border} bg-gradient-to-b from-white/10 to-transparent`} />
              </div>
            </div>

            {/* Nearby (exemple) */}
            <div className={`rounded-2xl border ${palette.border} ${palette.card} p-6 backdrop-blur-xl`}>
              <h2 className="text-lg font-medium">{t.nearby}</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Exemple statique, à remplacer si tu veux dynamiquement */}
                <SpotCard palette={palette} name="Plage de la Torche" dist="45 km" rating="Good" />
                <SpotCard palette={palette} name="Quiberon – Port Blanc" dist="15 km" rating="Fair" />
                <SpotCard palette={palette} name="Guidel – Fort Bloqué" dist="35 km" rating="Good" />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Favourites */}
            <div className={`rounded-2xl border ${palette.border} ${palette.card} p-6 backdrop-blur-xl`}>
              <h2 className="text-lg font-medium">{t.favourites}</h2>
              {favSpots.length === 0 ? (
                <p className={`mt-3 text-sm ${palette.sub}`}>☆ {t.add_fav}</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {favSpots.map((s) => {
                    const slug = spotSlug(s);
                    return (
                      <div key={slug} className={`flex items-center justify-between rounded-lg border ${palette.border} ${palette.card} px-3 py-2`}>
                        <button onClick={() => goToSpot(slug)} className="text-left">
                          <div className="font-medium">{s.name}</div>
                          <div className={`text-xs ${palette.sub}`}>{s.city}</div>
                        </button>
                        <button
                          onClick={() => toggleFav(slug)}
                          className={`px-2 ${palette.hover}`}
                          title={t.remove_fav}
                          aria-label={t.remove_fav}
                        >
                          ★
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Session */}
            <div className={`rounded-2xl border ${palette.border} ${palette.card} p-6 backdrop-blur-xl`}>
              <h2 className="text-lg font-medium">{t.session}</h2>
              <div className="mt-4 space-y-3 text-sm">
                {me?.authenticated ? (
                  <>
                    <Row palette={palette} k={t.status} v={t.logged_in} />
                    <Row palette={palette} k={t.email} v={me.email || ""} />
                    <button
                      onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); location.reload(); }}
                      className={`mt-2 w-full rounded-lg border ${palette.border20} ${palette.card} px-3 py-2 ${palette.hover}`}
                    >
                      {t.logout}
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <a href="/login" className={`w-1/2 rounded-lg border ${palette.border20} ${palette.card} px-3 py-2 text-center ${palette.hover}`}>{t.login}</a>
                    <a href="/register" className={`w-1/2 rounded-lg border ${palette.border20} ${palette.card} px-3 py-2 text-center ${palette.hover}`}>{t.register}</a>
                  </div>
                )}
              </div>
            </div>

            {/* Metrics */}
            <div className={`rounded-2xl border ${palette.border} ${palette.card} p-6 backdrop-blur-xl`}>
              <h2 className="text-lg font-medium">{t.quick_metrics}</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <MiniStat palette={palette} label={t.waveht_max} value={marine?.hourly?.wave_height ? `${Math.max(...marine.hourly.wave_height).toFixed(1)} ${marine.hourly_units?.wave_height || "m"}` : "—"} />
                <MiniStat palette={palette} label={t.period_max} value={marine?.hourly?.wave_period ? `${Math.max(...marine.hourly.wave_period).toFixed(0)} ${marine.hourly_units?.wave_period || "s"}` : "—"} />
                <MiniStat palette={palette} label={t.dir_now} value={nowData?.waveDirDeg != null ? `${Math.round(nowData.waveDirDeg)}° ${nowData.waveDirTxt}` : "—"} />
                <MiniStat palette={palette} label={t.windwavepk} value={nowData?.windWavePeakPeriod != null ? `${Math.round(nowData.windWavePeakPeriod)} ${nowData.units.windWavePeakPeriod}` : "—"} />
              </div>
              <div className={`mt-5 h-24 rounded-xl border ${palette.border} bg-gradient-to-b from-white/10 to-transparent`} />
            </div>

            {/* Checklist */}
            <div className={`rounded-2xl border ${palette.border} ${palette.card} p-6 backdrop-blur-xl`}>
              <h2 className="text-lg font-medium">{t.checklist}</h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-center gap-2"><Dot /> {t.wetsuit}</li>
                <li className="flex items-center gap-2"><Dot /> {t.leash}</li>
                <li className="flex items-center gap-2"><Dot /> {t.wax}</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

/* ------- UI small components (thémés) ------- */
function StatCard({ palette, title, value, hint }: { palette: any; title: string; value: string; hint: string; }) {
  return (
    <div className={`rounded-xl border ${palette.border} ${palette.card} p-4 backdrop-blur`}>
      <div className={`text-xs uppercase tracking-wider ${palette.sub}`}>{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      <div className={`mt-1 text-xs ${palette.sub}`}>{hint}</div>
    </div>
  );
}
function Badge({ palette, label }: { palette: any; label: string; }) {
  return <span className={`rounded-lg border ${palette.border} ${palette.card} px-2 py-1 text-xs opacity-90`}>{label}</span>;
}
function Row({ palette, k, v }: { palette: any; k: string; v: string; }) {
  return (
    <div className={`flex items-center justify-between rounded-lg border ${palette.border} ${palette.card} px-3 py-2`}>
      <span className={`${palette.sub}`}>{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
function SpotCard({ palette, name, dist, rating }: { palette: any; name: string; dist: string; rating: "Good" | "Fair" | "Poor" | string; }) {
  const tone = rating === "Good" ? "text-emerald-500" : rating === "Fair" ? "text-yellow-600" : "text-red-500";
  return (
    <a href="#" className={`group rounded-xl border ${palette.border} ${palette.card} p-4 backdrop-blur transition ${palette.hover}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{name}</h3>
        <span className={`text-xs ${tone}`}>{rating}</span>
      </div>
      <div className={`mt-1 text-xs ${palette.sub}`}>{dist}</div>
      <div className={`mt-4 h-16 rounded-lg border ${palette.border} bg-gradient-to-b from-white/10 to-transparent`} />
    </a>
  );
}
function MiniStat({ palette, label, value }: { palette: any; label: string; value: string; }) {
  return (
    <div className={`rounded-lg border ${palette.border} ${palette.card} p-3`}>
      <div className={`text-[10px] uppercase tracking-wider ${palette.sub}`}>{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
function Dot() {
  return <span className="inline-block h-2 w-2 rounded-full bg-current opacity-70" />;
}
