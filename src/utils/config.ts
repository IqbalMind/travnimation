export type TravelMethod = 'car' | 'shuttle' | 'bus' | 'motor' | 'walk' | 'plane' | 'train' | 'boat';

export const TRAVEL_METHODS: Record<TravelMethod, { label: string; emoji: string; color: string; road: boolean }> = {
  car: { label: 'Car', emoji: '🚗', color: '#ef4444', road: true },
  shuttle: { label: 'Shuttle', emoji: '🚐', color: '#f59e0b', road: true },
  bus: { label: 'Bus', emoji: '🚌', color: '#10b981', road: true },
  motor: { label: 'Motorcycle', emoji: '🏍️', color: '#8b5cf6', road: true },
  walk: { label: 'Walk', emoji: '🚶', color: '#ec4899', road: true },
  train: { label: 'Train', emoji: '🚆', color: '#0ea5e9', road: false },
  boat: { label: 'Boat', emoji: '⛴️', color: '#06b6d4', road: false },
  plane: { label: 'Plane', emoji: '✈️', color: '#3b82f6', road: false },
};

export type MapTheme = 'standard' | 'humanitarian' | 'dark' | 'vintage' | 'topo' | 'cycle';

const OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTR = '&copy; OpenStreetMap contributors';

/** All tile servers here are free and require NO API key. `filter` is a CSS filter applied to the tile pane. */
export const MAP_THEMES: Record<MapTheme, { label: string; url: string; attribution: string; filter?: string }> = {
  standard: { 
    label: 'Minimalist (Default)', 
    url: OSM, 
    attribution: OSM_ATTR,
    filter: 'grayscale(100%) opacity(70%) brightness(110%) contrast(90%)'
  },
  humanitarian: {
    label: 'Standard (OSM)',
    url: OSM,
    attribution: OSM_ATTR,
  },
  dark: {
    label: 'Dark Neon',
    url: OSM,
    attribution: OSM_ATTR,
    filter: 'invert(1) hue-rotate(180deg) brightness(0.9) contrast(1.1) saturate(0.6)',
  },
  vintage: {
    label: 'Vintage Paper',
    url: OSM,
    attribution: OSM_ATTR,
    filter: 'sepia(0.8) saturate(1.3) contrast(0.95) brightness(1.05)',
  },
  topo: {
    label: 'Adventure Topo',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: `${OSM_ATTR}, SRTM, OpenTopoMap (CC-BY-SA)`,
  },
  cycle: {
    label: 'CyclOSM',
    url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    attribution: `${OSM_ATTR}, CyclOSM`,
  },
};

export type CameraMode = 'steady' | 'fixed_zoom' | 'dynamic' | 'close_up';

export const CAMERA_MODES: Record<CameraMode, { label: string; description: string }> = {
  steady: { label: 'Steady', description: 'Follows the marker smoothly' },
  fixed_zoom: { label: 'Fixed zoom', description: 'One zoom level for the whole trip' },
  dynamic: { label: 'Dynamic', description: 'Follows local movement closely' },
  close_up: { label: 'Close-up', description: 'City-level, follows tightly' },
};

export type AspectRatio = '16:9' | '9:16' | '1:1';
export type VideoQuality = '720p' | '1080p' | '1440p' | '2160p';
export type FrameRate = 24 | 30 | 60;

export const VIDEO_CONFIGS = {
  aspectRatios: [
    { value: '16:9', label: '16:9 (Landscape)', width: 16, height: 9 },
    { value: '9:16', label: '9:16 (Vertical)', width: 9, height: 16 },
    { value: '1:1', label: '1:1 (Square)', width: 1, height: 1 },
  ],
  qualities: [
    { value: '720p', label: '720p HD', height: 720 },
    { value: '1080p', label: '1080p FHD', height: 1080 },
    { value: '1440p', label: '1440p QHD', height: 1440 },
    { value: '2160p', label: '2160p 4K', height: 2160 },
  ],
  framerates: [
    { value: 24, label: '24 FPS' },
    { value: 30, label: '30 FPS' },
    { value: 60, label: '60 FPS' },
  ]
};
