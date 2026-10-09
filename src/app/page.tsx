'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { parseItinerary, ItineraryPoint } from '@/utils/parser';
import { geocodePoints } from '@/utils/geocoder';
import { MAP_THEMES, MapTheme, TRAVEL_METHODS, TravelMethod, CameraMode, CAMERA_MODES, AspectRatio, VideoQuality, FrameRate, VIDEO_CONFIGS } from '@/utils/config';
import { Sparkles, RefreshCw, CheckCircle2, XCircle, Coffee, Map as MapIcon, Music } from 'lucide-react';

const JourneyMap = dynamic(() => import('@/components/JourneyMap'), {
  ssr: false,
  loading: () => <div className="h-[640px] rounded-2xl bg-slate-100 animate-pulse" />,
});

const SAMPLE = `20.00 start SPBU Pasteur
20.47 Rest Area KM 88 B
21.05 Rest Area KM 72B Cipularang
Rest Until 21.23
22.15 Tol Halim KM 0 Jakarta Bandung
22.30 Finish Binus Kemanggisan`;

export default function Home() {
  const [text, setText] = useState(SAMPLE);
  const [region, setRegion] = useState('Indonesia');
  const [method, setMethod] = useState<TravelMethod>('shuttle');
  const [theme, setTheme] = useState<MapTheme>('standard');
  const [audioOn, setAudioOn] = useState(true);
  const [duration, setDuration] = useState(25);
  const [points, setPoints] = useState<ItineraryPoint[]>([]);
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const [camera, setCamera] = useState<CameraMode>('dynamic');
  const [aspect, setAspect] = useState<AspectRatio>('16:9');
  const [quality, setQuality] = useState<VideoQuality>('1080p');
  const [fps, setFps] = useState<FrameRate>(30);

  const generate = async () => {
    setError('');
    const parsed = parseItinerary(text);
    if (parsed.length < 2) {
      setError('Need at least 2 lines like "20.07 Tol Pasteur".');
      return;
    }
    setLoading('Finding places…');
    const geo = await geocodePoints(parsed, region, (d, t) => setLoading(`Finding places… ${d}/${t}`));
    setPoints(geo);
    setLoading('');
    if (geo.some((p) => p.lat === undefined)) setError('Some places were not found. Edit them below (name or "lat,lng") and hit Re-locate.');
  };

  const editPoint = (id: string, name: string) =>
    setPoints((ps) => ps.map((p) => (p.id === id ? { ...p, locationName: name, lat: undefined, lng: undefined } : p)));

  const toggleRest = (idx: number) =>
    setPoints((ps) => {
      if (idx === 0) return ps;
      const prev = ps[idx - 1];
      return ps.map((p, i) => {
        if (i !== idx) return p;
        return p.isRest
          ? { ...p, isRest: false, ...(p.restore ?? { lat: undefined, lng: undefined }), restore: undefined }
          : {
              ...p,
              isRest: true,
              restore: { locationName: p.locationName, lat: p.lat, lng: p.lng },
              locationName: prev.locationName,
              lat: prev.lat,
              lng: prev.lng,
            };
      });
    });

  const relocate = async () => {
    setLoading('Re-locating…');
    const geo = await geocodePoints(points, region);
    setPoints(geo);
    setLoading('');
    setError(geo.some((p) => p.lat === undefined) ? 'Some places still not found. Try "lat,lng".' : '');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-slate-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight flex items-center">
              Trav<span className="text-blue-600">nimation</span> <MapIcon className="w-10 h-10 text-blue-600 ml-2" />
            </h1>
            <p className="text-slate-600 mt-1">Paste your trip log. Watch it come alive. Download the video.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          <aside className="space-y-4">
            <section className="card space-y-4">
              <div>
                <label className="lbl">Travel method</label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(TRAVEL_METHODS) as TravelMethod[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      title={TRAVEL_METHODS[m].label}
                      className={`rounded-xl py-2 text-2xl border-2 transition ${method === m ? 'border-blue-600 bg-blue-50 scale-105' : 'border-transparent bg-slate-100 hover:bg-slate-200'}`}
                    >
                      {TRAVEL_METHODS[m].emoji}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">{TRAVEL_METHODS[method].label}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="lbl">Map theme</label>
                  <select value={theme} onChange={(e) => setTheme(e.target.value as MapTheme)} className="inp">
                    {(Object.keys(MAP_THEMES) as MapTheme[]).map((t) => (
                      <option key={t} value={t}>{MAP_THEMES[t].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="lbl">Region hint</label>
                  <input value={region} onChange={(e) => setRegion(e.target.value)} className="inp" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="lbl">Video length: {duration}s</label>
                  <input type="range" min={10} max={60} value={duration} onChange={(e) => setDuration(+e.target.value)} className="w-full accent-blue-600" />
                </div>
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
                  <input type="checkbox" checked={audioOn} onChange={(e) => setAudioOn(e.target.checked)} className="accent-blue-600 w-4 h-4" />
                  <span className="flex items-center gap-1.5"><Music className="w-4 h-4" /> Music & SFX</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="lbl">Camera Mode</label>
                  <select value={camera} onChange={(e) => setCamera(e.target.value as CameraMode)} className="inp">
                    {(Object.keys(CAMERA_MODES) as CameraMode[]).map((c) => (
                      <option key={c} value={c}>{CAMERA_MODES[c].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="lbl">Aspect Ratio</label>
                  <select value={aspect} onChange={(e) => setAspect(e.target.value as AspectRatio)} className="inp">
                    {VIDEO_CONFIGS.aspectRatios.map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="lbl">Quality</label>
                  <select value={quality} onChange={(e) => setQuality(e.target.value as VideoQuality)} className="inp">
                    {VIDEO_CONFIGS.qualities.map((q) => (
                      <option key={q.value} value={q.value}>{q.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="lbl">Framerate</label>
                  <select value={fps.toString()} onChange={(e) => setFps(parseInt(e.target.value) as FrameRate)} className="inp">
                    {VIDEO_CONFIGS.framerates.map((f) => (
                      <option key={f.value} value={f.value.toString()}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="lbl">Itinerary</label>
                <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} className="inp font-mono text-sm" />
              </div>

              <button onClick={generate} disabled={!!loading} className="btn w-full bg-slate-900 py-3 flex items-center justify-center gap-2">
                {loading || <><Sparkles className="w-5 h-5" /> Generate Route</>}
              </button>
              {error && <p className="text-red-600 text-sm">{error}</p>}
            </section>

            {points.length > 0 && (
              <section className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold">Stops</h3>
                  <button onClick={relocate} disabled={!!loading} className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Re-locate</button>
                </div>
                <ul className="space-y-2">
                  {points.map((p, idx) => (
                    <li key={p.id} className="flex items-center gap-2 text-sm">
                      <span className="font-mono font-bold w-12">{p.time}</span>
                      {p.isRest ? (
                        <span className="text-amber-600 italic flex-1 truncate flex items-center gap-1.5"><Coffee className="w-4 h-4" /> resting at {p.locationName}</span>
                      ) : (
                        <input value={p.locationName} onChange={(e) => editPoint(p.id, e.target.value)} className="inp py-1 flex-1" />
                      )}
                      {idx > 0 && (
                        <button
                          onClick={() => toggleRest(idx)}
                          title={p.isRest ? 'Resting here — click to make it a drive' : 'Mark as rest (stay at previous stop)'}
                          className={`rounded-md px-1.5 py-0.5 text-xs border ${p.isRest ? 'bg-amber-100 border-amber-400' : 'border-slate-200 opacity-50 hover:opacity-100'}`}
                        >
                          <Coffee className="w-3 h-3" />
                        </button>
                      )}
                      <span title={p.lat !== undefined ? `${p.lat.toFixed(4)}, ${p.lng!.toFixed(4)}` : 'not found'}>
                        {p.lat !== undefined ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>

          <section>
            <JourneyMap points={points} method={method} theme={theme} audioOn={audioOn} durationSec={duration} camera={camera} aspect={aspect} quality={quality} fps={fps} />
            <p className="text-xs text-slate-500 mt-2">
              Videos are rendered deterministically using WebCodecs at your chosen framerate and quality.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
