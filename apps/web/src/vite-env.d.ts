/// <reference types="vite/client" />

declare module "*.webm" {
  const src: string;
  export default src;
}

declare module "*.mp4" {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  /** Export → Web → URL ending in scene.splinecode (React runtime; enables buddyState sync) */
  readonly VITE_SPLINE_SCENE_URL?: string;
  /** Optional override for https://my.spline.design/.../ share page (iframe embed) */
  readonly VITE_SPLINE_VIEWER_URL?: string;
  readonly VITE_BUDDY_USE_SPLINE?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_ELEVENLABS_API_KEY?: string;
  readonly VITE_MAPBOX_TOKEN?: string;
  readonly VITE_FOURSQUARE_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Web Speech API
interface Window {
  webkitSpeechRecognition: typeof SpeechRecognition;
}
