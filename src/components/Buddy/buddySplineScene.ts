/**
 * **Runtime** (`scene.splinecode`) — `@splinetool/react-spline`; can sync `buddyState`.
 * Default: https://prod.spline.design/76ZfQ3971TWWhcYf/scene.splinecode
 *
 * **Iframe** (`my.spline.design/...`) — only used when no runtime URL is set.
 * Override with `VITE_SPLINE_SCENE_URL=` empty if you want iframe-only.
 */

const DEFAULT_SCENE_URL =
  "https://prod.spline.design/76ZfQ3971TWWhcYf/scene.splinecode";

const envScene = import.meta.env.VITE_SPLINE_SCENE_URL?.trim();

/**
 * `VITE_SPLINE_SCENE_URL` overrides default. Set to empty string to force iframe mode.
 */
export const buddySplineSceneUrl: string | null =
  envScene === ""
    ? null
    : envScene && envScene.length > 0
      ? envScene
      : DEFAULT_SCENE_URL;

/** Public viewer page; used when `buddySplineSceneUrl` is null. */
export const buddySplineViewerPageUrl: string =
  import.meta.env.VITE_SPLINE_VIEWER_URL?.trim() ||
  "https://my.spline.design/untitled-VHWJSkvONhICX3zYjXAzuayK/";

/**
 * String variable name in Spline (runtime mode only). Values: idle | talking | happy | thinking
 */
export const buddySplineStateVariableName: string | null = "buddyState";

/** Set VITE_BUDDY_USE_SPLINE=0 in `.env` for PNG + CSS Buddy. */
export const buddyUseSpline: boolean =
  import.meta.env.VITE_BUDDY_USE_SPLINE !== "0";
