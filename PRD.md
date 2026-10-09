# Product Requirements Document (PRD): Travnimation

## 1. Overview
**Travnimation** is a web-based application that allows users to input a text-based travel itinerary (times and locations) and generates an animated, highly engaging, and downloadable video of their journey on a map. 

## 2. Goals & Objectives
* **Ease of Use:** Users can paste raw text logs (e.g., "20.07 WIB start Tol Pasteur") without needing a strict data format.
* **100% Free & Open Source:** Rely entirely on open-source libraries and free APIs (no API keys required for core functionality).
* **Exportable & Shareable Media:** Users can play the animation in the browser and download the generated journey as a fun, social-media-ready video file (MP4 or WebM).

## 3. Core Features
1. **Itinerary Parser:** Parses natural language text to extract timestamps, location names, and specific states (like "Rest" stops).
2. **Travel Method Selection:** Users choose a transport mode (Car, Shuttle, Bus, Motor, Walk, Plane), which updates the vehicle icon.
3. **Thematic Map Styles:** Users can select fun map themes (e.g., Watercolor, Retro 8-Bit, Dark Neon) powered by free tile providers.
4. **Geocoding Engine:** Automatically queries free Geocoding APIs (e.g., OpenStreetMap Nominatim) to convert place names into coordinates.
5. **Dynamic Camera Modes:** Users can select how the camera tracks the vehicle (Steady, Fixed zoom, Dynamic, Close-up).
6. **Milestone Pop-ups & Real-time Stats:** Arrival at a destination triggers a visual pop-up. A live distance/time overlay updates during the journey.
7. **Audio & Sound Effects:** Background music and vehicle-specific sound effects.
8. **Advanced Video Export:** Captures the map animation into an MP4 file with customizable Aspect Ratio (9:16, 1:1, 16:9), Quality (720p, 1080p, 1440p, 2160p), and Framerate (24, 30, 60 FPS).

## 4. Technical Constraints & Decisions
* **Frontend:** Next.js (React) with Tailwind CSS.
* **Mapping:** Leaflet.js (open source, BSD) with keyless tiles only: OpenStreetMap, OSM Humanitarian (HOT), OpenTopoMap, CyclOSM. Dark Neon / Vintage themes are CSS filters over OSM tiles. **No API key required.** Mapbox, CARTO and Stadia are not used (they require keys).
* **Routing:** Public OSRM server (`router.project-osrm.org`, open source) for road-following paths; straight line fallback.
* **Geocoding:** OSM Nominatim API (rate-limited to 1 request/second to comply with TOS).
* **Video Generation:** We will use `mp4-muxer` and WebCodecs (`VideoEncoder`/`AudioEncoder`) for deterministic, frame-by-frame rendering at precise resolutions and framerates, combined with a DOM-to-canvas solution to capture the Leaflet map tiles.

## 5. User Flow
1. **Input & Customization:** User pastes timeline, selects Travel Method, Map Theme, and Audio Track.
2. **Process:** The app parses text, geocodes locations (showing loading state), and previews the map.
3. **Review:** User views the route and pop-ups.
4. **Animate & Export:** User clicks "Record & Download". The camera tracks the vehicle, pop-ups trigger, music plays, and a video file is downloaded automatically at the end.
