# System Design: Travnimation

## 1. Architecture Overview
Travnimation is a client-heavy web application. To keep operations free and serverless, all rendering, parsing, and video encoding happens inside the user's browser.

### Tech Stack
* **Framework:** Next.js (App Router)
* **Styling:** Tailwind CSS + Lucide React (Icons)
* **Map Engine:** Leaflet (`leaflet`, `react-leaflet`)
* **Spatial Math:** Turf.js (`@turf/turf` for interpolating points, and `@turf/great-circle` for curving plane arcs)
* **Geocoding:** OpenStreetMap Nominatim API (Called from client)
* **Audio:** Web Audio API / HTML5 Audio
* **Video Encoding:** WebCodecs API (`VideoEncoder`) + `mp4-muxer` (frame-by-frame rendering)

## 2. Component Design

### 2.1 Parser & Geocoder (`src/utils/`)
* **Parser:** Extracts `time`, `locationName`, and `isRest`.
* **Geocoder:** Queries Nominatim (1 req/sec limit). Returns array of valid coordinate nodes.

### 2.2 Map Component (`src/components/JourneyMap.tsx`)
* **Tile Layers:** State-driven `url` for `<TileLayer>` to swap between themes (Standard, Watercolor, CartoDB Dark, etc.).
* **Path Rendering:**
  * If `travelMethod === 'Plane'`, use `turf.greatCircle()` between points to draw arcs.
  * Otherwise, use standard straight lines or routing (if a free router is integrated later).
* **Animation & Camera Loop (`requestAnimationFrame` or deterministic render loop):**
  * Update vehicle coordinate.
  * Update Map center based on selected Camera Mode (Steady, Fixed zoom, Dynamic, Close-up).
  * Check distance to next milestone. If distance < threshold, trigger **Milestone Pop-up** overlay state.
  * Update real-time stats (Distance traveled, current timestamp).

### 2.3 Audio System (`src/utils/audio.ts`)
* Preload a set of free, open-source sound effects (swoosh, vroom, pop).
* Trigger HTML5 Audio playback synchronized with the animation loop.

### 2.4 Video Recorder (`src/utils/recorder.ts`)
* **Frame-by-Frame WebCodecs Pipeline:**
  * Uses `mp4-muxer` to multiplex video and audio into a downloadable `.mp4` file.
  * During recording, the animation loop is decoupled from wall-clock time and stepped deterministically by `1/FPS` seconds.
  * Captures the Leaflet DOM to a canvas for each frame and feeds it to `VideoEncoder`.
  * Encodes the frame and repeats until the journey is complete.

## 3. UI/UX Layout
* **Left Panel (Settings & Input):** 
  * "Map Theme" Dropdown (Standard, Watercolor, Dark Neon).
  * "Travel Method" Dropdown (Car, Shuttle, Bus, Motor, Walk, Plane).
  * "Camera Mode" Dropdown (Steady, Fixed zoom, Dynamic, Close-up).
  * "Export Settings" (Aspect Ratio, Quality, FPS).
  * "Audio" Toggle (Music & SFX ON/OFF).
  * "Itinerary" Textarea.
  * "Generate Route" Button.
  * "Detected Points" list.
* **Right Panel (Preview & Action):**
  * Large Leaflet Map Container.
  * **Overlays:** Real-time stats HUD (top-left), Milestone Pop-ups.
  * **Controls:** "Play Preview" and "Record & Download Video".
