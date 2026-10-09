'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as turf from '@turf/turf';
import { ItineraryPoint } from '@/utils/parser';
import { MAP_THEMES, MapTheme, TRAVEL_METHODS, TravelMethod, CameraMode, AspectRatio, VideoQuality, FrameRate, VIDEO_CONFIGS } from '@/utils/config';
import { buildLeg } from '@/utils/router';
import { AudioEngine } from '@/utils/audio';
import { VideoExporter } from '@/utils/recorder';
import { toCanvas } from 'html-to-image';
import { Coffee, Camera, Play, Square, Video } from 'lucide-react';

type Coord = [number, number]; // [lng, lat]

interface Leg {
  coords: Coord[];
  cum: number[]; // cumulative km per vertex
  km: number;
  from: ItineraryPoint;
  to: ItineraryPoint;
  animMs: number;
  isRest: boolean;
}

interface Props {
  points: ItineraryPoint[];
  method: TravelMethod;
  theme: MapTheme;
  audioOn: boolean;
  durationSec: number;
  camera: CameraMode;
  aspect: AspectRatio;
  quality: VideoQuality;
  fps: FrameRate;
}

const ARRIVAL_PAUSE_MS = 1400;
const toLatLng = (c: Coord): L.LatLngTuple => [c[1], c[0]];
const fmtTime = (m: number) => {
  const h = Math.floor(m / 60) % 24;
  return `${String(h).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;
};

export default function JourneyMap({ points, method, theme, audioOn, durationSec, camera, aspect, quality, fps }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const vehicleRef = useRef<L.Marker | null>(null);
  const trailRef = useRef<L.Polyline | null>(null);
  const legsRef = useRef<Leg[]>([]);
  const rafRef = useRef<number | null>(null);
  const audioRef = useRef(new AudioEngine());
  const exporterRef = useRef<VideoExporter | null>(null);

  const [routing, setRouting] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [renderProgress, setRenderProgress] = useState<{ frame: number; total: number } | null>(null);
  const [hud, setHud] = useState({ clock: '--:--', km: 0, totalKm: 0 });
  const [popup, setPopup] = useState<{ name: string; time: string; rest?: boolean } | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null);
  const [error, setError] = useState('');

  const cfg = TRAVEL_METHODS[method];
  const valid = points.filter((p) => p.lat !== undefined && p.lng !== undefined);

  // Resolution calculation
  const qConf = VIDEO_CONFIGS.qualities.find(q => q.value === quality)!;
  const aConf = VIDEO_CONFIGS.aspectRatios.find(a => a.value === aspect)!;
  const targetHeight = qConf.height;
  const targetWidth = Math.round(targetHeight * (aConf.width / aConf.height));

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false, preferCanvas: true }).setView([-6.6, 107.2], 9);
    mapRef.current = map;
    layersRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    tileRef.current?.remove();
    const t = MAP_THEMES[theme];
    tileRef.current = L.tileLayer(t.url, { attribution: t.attribution, maxZoom: 18, crossOrigin: 'anonymous' }).addTo(map);
    map.getPane('tilePane')!.style.filter = t.filter ?? '';
    containerRef.current?.classList.toggle('neon', theme === 'dark');
    if (containerRef.current) containerRef.current.style.background = theme === 'dark' ? '#111' : '';
  }, [theme]);

  useEffect(() => {
    if (mapRef.current) setTimeout(() => mapRef.current?.invalidateSize(), 50);
  }, [targetWidth, targetHeight]);

  useEffect(() => {
    const map = mapRef.current;
    const group = layersRef.current;
    if (!map || !group) return;
    let cancelled = false;

    (async () => {
      group.clearLayers();
      legsRef.current = [];
      if (valid.length < 2) return;
      setRouting(true);
      setError('');

      const legs: Leg[] = [];
      for (let i = 1; i < valid.length; i++) {
        const a = valid[i - 1];
        const b = valid[i];
        const from: Coord = [a.lng!, a.lat!];
        const to: Coord = [b.lng!, b.lat!];
        const isRest = b.isRest || (from[0] === to[0] && from[1] === to[1]);
        const coords = isRest ? [from, to] : await buildLeg(from, to, method);
        if (cancelled) return;
        const cum = [0];
        for (let k = 1; k < coords.length; k++) {
          cum.push(cum[k - 1] + turf.distance(coords[k - 1], coords[k], { units: 'kilometers' }));
        }
        legs.push({ coords, cum, km: cum[cum.length - 1], from: a, to: b, animMs: 0, isRest });
      }

      const realMins = legs.map((l) => Math.max(1, l.to.minutes - l.from.minutes));
      const totalMins = realMins.reduce((s, m) => s + m, 0);
      const budget = durationSec * 1000;
      legs.forEach((l, i) => {
        const share = (realMins[i] / totalMins) * budget;
        l.animMs = l.isRest ? Math.min(Math.max(share, 1200), 2500) : Math.max(share, 1500);
      });
      legsRef.current = legs;

      const all = legs.flatMap((l) => l.coords.map(toLatLng));
      L.polyline(all, { color: cfg.color, weight: 4, opacity: 0.25, dashArray: method === 'plane' ? '8 10' : undefined }).addTo(group);
      trailRef.current = L.polyline([], { color: cfg.color, weight: 6, opacity: 0.95, lineCap: 'round' }).addTo(group);

      valid.forEach((p, i) => {
        if (p.isRest) return;
        const icon = L.divIcon({
          className: 'bg-transparent flex items-center justify-center',
          html: `<div style="width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3); background-color: ${i === 0 ? '#10b981' : i === valid.length - 1 ? '#e11d48' : '#2563eb'};"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });
        L.marker([p.lat!, p.lng!], { icon }).bindTooltip(`${p.time} · ${p.locationName}`).addTo(group);
      });

      vehicleRef.current = L.marker([valid[0].lat!, valid[0].lng!], { icon: vehicleIcon(cfg.emoji, false), zIndexOffset: 1000 }).addTo(group);

      const totalKm = legs.reduce((s, l) => s + l.km, 0);
      setHud({ clock: valid[0].time, km: 0, totalKm });
      map.fitBounds(L.latLngBounds(all), { padding: [40, 40] });
      setRouting(false);
    })().catch((e) => {
      console.error(e);
      setError('Failed to build route.');
      setRouting(false);
    });

    return () => { cancelled = true; };
  }, [JSON.stringify(valid.map((p) => [p.lat, p.lng, p.minutes, p.isRest])), method, durationSec]);

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    audioRef.current.stopAll();
    setPlaying(false);
  };

  const play = async (record: boolean) => {
    const map = mapRef.current;
    const legs = legsRef.current;
    if (!map || !containerRef.current || legs.length === 0 || playing) return;
    setError('');

    if (record) {
      setRecording(true);
      await new Promise((r) => setTimeout(r, 50)); // Ensure React has flushed the recording=true state
      exporterRef.current = new VideoExporter(targetWidth, targetHeight, fps);
    }

    if (audioOn && !record) {
      await audioRef.current.resume();
      audioRef.current.startMusic();
    }

    setPlaying(true);
    setPopup(null);
    trailRef.current?.setLatLngs([]);

    const followZoom = camera === 'close_up' ? 16 : camera === 'dynamic' ? 14 : camera === 'steady' ? 12 : 9;
    const start = valid[0];
    
    if (camera !== 'fixed_zoom') {
      if (record) {
        map.setView([start.lat!, start.lng!], followZoom, { animate: false });
      } else {
        map.flyTo([start.lat!, start.lng!], followZoom, { duration: 1.2 });
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
    
    setPopup({ name: start.locationName, time: start.time });
    const startPt = map.latLngToContainerPoint([start.lat!, start.lng!]);
    setPopupPos({ x: startPt.x, y: startPt.y });
    if (audioOn && !record) audioRef.current.pop();
    
    // Total frames calculation for offline render
    const totalMs = legs.reduce((acc, l) => acc + l.animMs + ARRIVAL_PAUSE_MS, 0);
    const totalFrames = Math.ceil((totalMs / 1000) * fps);

    if (record) {
      try {
        await renderOffline(map, captureRef.current!, legs, totalFrames, followZoom);
      } catch (e) {
        console.error("Export failed:", e);
        setError("Export failed: Some map images couldn't load due to network/CORS restrictions.");
        stop();
      }
      return;
    }

    let legIdx = 0;
    let legStart = performance.now();
    let pausedUntil = performance.now() + ARRIVAL_PAUSE_MS;
    let kmDone = 0;
    const doneTrail: L.LatLngTuple[] = [];
    let engineOn = false;

    const finish = async () => {
      stop();
      const all = legs.flatMap((l) => l.coords.map(toLatLng));
      map.flyToBounds(L.latLngBounds(all), { padding: [40, 40], duration: 1.5 });
    };

    const frame = (now: number) => {
      if (now < pausedUntil) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }
      const leg = legs[legIdx];
      const t = Math.max(0, Math.min(1, (now - legStart) / leg.animMs));

      updateStateForTime(t, leg, legs, legIdx, followZoom, kmDone, doneTrail, map, record, false);

      if (t >= 1) {
        if (!leg.isRest) {
          doneTrail.push(...leg.coords.map(toLatLng));
          kmDone += leg.km;
        }
        legIdx++;
        const next = legs[legIdx];
        if (!leg.isRest && !(next && next.isRest)) {
          if (engineOn) { audioRef.current.stopEngine(); engineOn = false; }
          setPopup({ name: leg.to.locationName, time: leg.to.time });
          if (audioOn) audioRef.current.pop();
          pausedUntil = now + ARRIVAL_PAUSE_MS;
          setTimeout(() => setPopup(null), ARRIVAL_PAUSE_MS);
        } else if (leg.isRest) {
          setPopup(null);
        } else {
          setPopup({ name: leg.to.locationName, time: leg.to.time });
          if (audioOn) audioRef.current.pop();
        }
        if (legIdx >= legs.length) {
          setTimeout(finish, ARRIVAL_PAUSE_MS);
          return;
        }
        legStart = Math.max(now, pausedUntil);
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  };

  const renderOffline = async (map: L.Map, capture: HTMLDivElement, legs: Leg[], totalFrames: number, followZoom: number) => {
    let currentFrame = 0;
    let legIdx = 0;
    let timeInLeg = 0;
    let inPause = true;
    let pauseRemaining = ARRIVAL_PAUSE_MS;
    let kmDone = 0;
    const doneTrail: L.LatLngTuple[] = [];
    const dt = 1000 / fps;

    setRenderProgress({ frame: 0, total: totalFrames });

    while (legIdx < legs.length) {
      if (inPause) {
        pauseRemaining -= dt;
        if (pauseRemaining <= 0) {
          inPause = false;
          setPopup(null);
        }
      } else {
        const leg = legs[legIdx];
        timeInLeg += dt;
        const t = Math.max(0, Math.min(1, timeInLeg / leg.animMs));
        
        updateStateForTime(t, leg, legs, legIdx, followZoom, kmDone, doneTrail, map, true, true);

        if (t >= 1) {
          if (!leg.isRest) {
            doneTrail.push(...leg.coords.map(toLatLng));
            kmDone += leg.km;
          }
          legIdx++;
          timeInLeg = 0;
          const next = legs[legIdx];
          
          if (!leg.isRest && !(next && next.isRest)) {
            setPopup({ name: leg.to.locationName, time: leg.to.time });
            inPause = true;
            pauseRemaining = ARRIVAL_PAUSE_MS;
          } else if (leg.isRest) {
            setPopup(null);
          } else {
            setPopup({ name: leg.to.locationName, time: leg.to.time });
          }
        }
      }

      // Wait for any new tiles to load over the network before capturing the DOM
      if (tileRef.current && tileRef.current.isLoading()) {
        await new Promise<void>((resolve) => tileRef.current!.once('load', () => resolve()));
        await new Promise((r) => setTimeout(r, 50)); // Ensure DOM is painted
      }

      // Render frame
      if (capture) {
        const canvas = await toCanvas(capture, { 
          pixelRatio: 1,
          imagePlaceholder: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
        });
        await exporterRef.current?.addFrame(canvas);
      }
      
      currentFrame++;
      if (currentFrame % 5 === 0) setRenderProgress({ frame: currentFrame, total: totalFrames });
    }

    await exporterRef.current?.save('travnimation');
    setRecording(false);
    setPlaying(false);
    setRenderProgress(null);
    setTimeout(() => map.invalidateSize(), 100);
  };

  const updateStateForTime = (t: number, leg: Leg, legs: Leg[], legIdx: number, followZoom: number, kmDone: number, doneTrail: L.LatLngTuple[], map: L.Map, isRecording: boolean, forceSyncMap: boolean) => {
    if (leg.isRest) {
      const pos = toLatLng([leg.from.lng!, leg.from.lat!]);
      const pt = map.latLngToContainerPoint(pos);
      setPopupPos({ x: pt.x, y: pt.y });
      setHud((h) => ({ ...h, clock: fmtTime(leg.from.minutes + (leg.to.minutes - leg.from.minutes) * t) }));
      setPopup({ name: `Resting at ${leg.from.locationName}`, time: `until ${leg.to.time}`, rest: true });
    } else {
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const d = eased * leg.km;
      let k = 1;
      while (k < leg.cum.length - 1 && leg.cum[k] < d) k++;
      const segLen = leg.cum[k] - leg.cum[k - 1] || 1;
      const f = Math.min(1, Math.max(0, (d - leg.cum[k - 1]) / segLen));
      const a = leg.coords[k - 1];
      const b = leg.coords[k];
      const pos: Coord = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      const latlng = toLatLng(pos);

      vehicleRef.current?.setLatLng(latlng);
      vehicleRef.current?.setIcon(vehicleIcon(cfg.emoji, b[0] > a[0]));
      trailRef.current?.setLatLngs([...doneTrail, ...leg.coords.slice(0, k).map(toLatLng), latlng]);
      
      if (camera !== 'fixed_zoom') {
        const zoom = camera === 'close_up' ? 16 : camera === 'dynamic' ? 14 : camera === 'steady' ? 12 : followZoom;
        map.setView(latlng, zoom, { animate: false });
      }

      const pt = map.latLngToContainerPoint(latlng);
      setPopupPos({ x: pt.x, y: pt.y });

      setHud((h) => ({
        ...h,
        km: Math.min(h.totalKm, kmDone + d),
        clock: fmtTime(leg.from.minutes + (leg.to.minutes - leg.from.minutes) * eased),
      }));
    }
  };

  useEffect(() => () => stop(), []);

  // Calculate responsive UI scale based on the shortest dimension of the video
  const uiScale = Math.max(1, Math.min(targetWidth, targetHeight) / 600);

  return (
    <div className={recording ? 'fixed top-0 left-0 z-[9999] bg-black flex items-center justify-center w-screen h-screen' : 'flex justify-center w-full'}>
      <div 
        className={`relative overflow-hidden shadow-xl border border-slate-200 bg-slate-100 ${recording ? '' : 'rounded-2xl w-full'}`}
        style={!recording ? { maxWidth: `calc(70vh * ${aConf.width / aConf.height})`, aspectRatio: `${aConf.width} / ${aConf.height}`, containerType: 'size' } : { width: targetWidth, height: targetHeight, transform: `scale(${Math.min(window.innerWidth/targetWidth, window.innerHeight/targetHeight)})` }}
      >
        <div 
          ref={captureRef}
          style={!recording ? { width: targetWidth, height: targetHeight, transformOrigin: 'top left', transform: `scale(calc(100cqw / ${targetWidth}))` } : { width: targetWidth, height: targetHeight }}
          className="absolute top-0 left-0 overflow-hidden bg-slate-100"
        >
        <div ref={containerRef} className="absolute inset-0" />

        {/* HUD */}
        <div className="absolute top-4 left-14 z-[1000] flex gap-2 pointer-events-none" style={{ transform: `scale(${uiScale})`, transformOrigin: 'top left' }}>
          <div className="hud-chip text-2xl">{cfg.emoji}</div>
          <div className="hud-chip">
            <div className="text-[10px] uppercase tracking-wider opacity-70">Time</div>
            <div className="text-xl font-bold tabular-nums">{hud.clock}</div>
          </div>
          <div className="hud-chip">
            <div className="text-[10px] uppercase tracking-wider opacity-70">Distance</div>
            <div className="text-xl font-bold tabular-nums">
              {hud.km.toFixed(1)} <span className="text-xs font-normal opacity-70">/ {hud.totalKm.toFixed(0)} km</span>
            </div>
          </div>
        </div>

        {/* Milestone popup */}
        {popup && popupPos && (
          <div className="absolute z-[1000] -translate-x-1/2 -translate-y-[140%] pointer-events-none" style={{ left: popupPos.x, top: popupPos.y, transform: `translate(-50%, -140%) scale(${uiScale})` }}>
            <div className={`milestone ${popup.rest ? 'milestone-rest' : ''}`}>
              <div className="text-xs font-semibold opacity-70 flex items-center justify-center gap-1">
                {popup.rest ? <Coffee className="w-3 h-3" /> : <Camera className="w-3 h-3" />}
                {popup.time}
              </div>
              <div className="text-lg font-extrabold leading-tight max-w-[200px] text-center whitespace-normal">{popup.name}</div>
            </div>
          </div>
        )}
      </div>

      {/* Record Overlay */}
      {recording && renderProgress && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-black/80 text-white px-6 py-3 rounded-full font-semibold z-[10000]">
          Rendering {quality} {fps}FPS video: {Math.round((renderProgress.frame / renderProgress.total) * 100)}%
        </div>
      )}

      {routing && (
        <div className="absolute inset-0 z-[1001] grid place-items-center bg-white/60 backdrop-blur-sm font-semibold">
          Building route…
        </div>
      )}

      {!recording && (
        <div className="absolute bottom-6 right-4 z-[1000] flex gap-2">
          {playing ? (
            <button onClick={stop} className="btn bg-slate-800 flex items-center gap-2"><Square className="fill-current w-4 h-4" /> Stop</button>
          ) : (
            <>
              <button onClick={() => play(false)} disabled={routing || valid.length < 2} className="btn bg-blue-600 flex items-center justify-center gap-2"><Play className="fill-current w-4 h-4" /> Preview</button>
              <button onClick={() => play(true)} disabled={routing || valid.length < 2} className="btn bg-indigo-600 flex items-center justify-center gap-2"><Video className="w-4 h-4" /> Download Video</button>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="absolute bottom-20 right-4 z-[1000] max-w-sm bg-red-600 text-white text-sm rounded-lg px-3 py-2 shadow">{error}</div>
      )}
      </div>
    </div>
  );
}

function vehicleIcon(emoji: string, facingEast: boolean) {
  return L.divIcon({
    className: '',
    html: `<div class="vehicle" style="transform:scaleX(${facingEast ? -1 : 1})">${emoji}</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}
