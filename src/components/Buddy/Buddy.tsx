import type { Application } from "@splinetool/runtime";
import { lazy, Suspense, useCallback, useEffect, useRef } from "react";

const Spline = lazy(() => import("@splinetool/react-spline"));

import type { BuddyState } from "./types";
import { buddyAnimationSources } from "./buddyAnimationSources";
import { buddyVideoSources } from "./buddyVideoSources";
import {
  buddySplineSceneUrl,
  buddySplineStateVariableName,
  buddySplineViewerPageUrl,
  buddyUseSpline,
} from "./buddySplineScene";

import styles from "./Buddy.module.css";

export type BuddySize = "hero" | "mini" | "default";
type BuddyRenderMode = "spline" | "video" | "png";

type BuddyProps = {
  state: BuddyState;
  className?: string;
  label?: string;
  /** Render size: "hero" (large, ~240px), "mini" (small, ~64px), "default" (160px) */
  size?: BuddySize;
  /** Force a render mode instead of auto-detecting */
  mode?: BuddyRenderMode;
};

const stateClass: Record<BuddyState, string> = {
  idle: styles.idle,
  talking: styles.talking,
  happy: styles.happy,
  thinking: styles.thinking,
};

const sizeClass: Record<BuddySize, string> = {
  hero: styles.frameHero,
  mini: styles.frameMini,
  default: styles.frame,
};

function pushSplineState(app: Application, state: BuddyState) {
  if (!buddySplineStateVariableName) return;
  try {
    app.setVariable(buddySplineStateVariableName, state);
  } catch {
    /* variable missing in scene — safe to ignore */
  }
}

export function Buddy({ state, className, label, size = "default", mode }: BuddyProps) {
  const splineRef = useRef<Application | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const onSplineLoad = useCallback((app: Application) => {
    splineRef.current = app;
    pushSplineState(app, stateRef.current);
  }, []);

  useEffect(() => {
    const app = splineRef.current;
    if (app) pushSplineState(app, state);
  }, [state]);

  // Determine render mode
  const resolvedMode: BuddyRenderMode =
    mode ??
    (buddyUseSpline && buddySplineSceneUrl
      ? "spline"
      : "video");

  const frameClass = `${sizeClass[size]} ${className ?? ""}`.trim();

  // ── Spline 3D ──
  if (resolvedMode === "spline" && buddySplineSceneUrl) {
    return (
      <div
        className={`${styles.frame} ${styles.frameSpline} ${className ?? ""}`.trim()}
        aria-label={label ?? `Buddy — ${state}`}
      >
        <div className={styles.splineHost}>
          <Suspense fallback={<VideoFallback state={state} size={size} />}>
            <Spline scene={buddySplineSceneUrl} onLoad={onSplineLoad} />
          </Suspense>
        </div>
      </div>
    );
  }

  // ── Spline iframe ──
  if (resolvedMode === "spline" && buddySplineViewerPageUrl) {
    return (
      <div
        className={`${styles.frame} ${styles.frameSpline} ${className ?? ""}`.trim()}
        aria-label={label ?? `Buddy — ${state}`}
      >
        <div className={styles.splineHost}>
          <iframe
            className={styles.splineIframe}
            src={buddySplineViewerPageUrl}
            title={label ?? "Buddy 3D scene"}
            allow="fullscreen; xr-spatial-tracking"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    );
  }

  // ── Video (transparent WebM) ──
  if (resolvedMode === "video") {
    return <VideoFallback state={state} size={size} className={className} label={label} />;
  }

  // ── PNG fallback ──
  const src = buddyAnimationSources[state];
  return (
    <div
      key={state}
      className={`${frameClass} ${stateClass[state]}`}
      aria-label={label ?? `Buddy — ${state}`}
    >
      <img className={styles.img} src={src} alt="" draggable={false} />
    </div>
  );
}

/** Video sub-component used as primary render and Spline loading fallback */
function VideoFallback({
  state,
  size = "default",
  className,
  label,
}: {
  state: BuddyState;
  size?: BuddySize;
  className?: string;
  label?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoSrc = buddyVideoSources[state];
  const frameClass = `${sizeClass[size]} ${className ?? ""}`.trim();

  // Swap video source when state changes
  useEffect(() => {
    const video = videoRef.current;
    if (video && video.src !== videoSrc) {
      video.src = videoSrc;
      video.load();
      video.play().catch(() => {});
    }
  }, [videoSrc]);

  return (
    <div className={frameClass} aria-label={label ?? `Buddy — ${state}`}>
      <video
        ref={videoRef}
        className={styles.video}
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        disablePictureInPicture
      />
    </div>
  );
}
