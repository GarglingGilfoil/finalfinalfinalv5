import { useEffect, useId, useState } from "react";

const MARK_LEFT_PATH =
  "M410.569 0H206.389L25.2253 431.155C9.17282 458.675 0 493.076 0 527.476C0 637.558 91.7283 727 201.802 727C238.372 727 305.19 727 305.19 727C245.236 692.385 201.89 600.986 201.89 527.476C201.89 493.076 211.063 458.675 227.115 431.155L410.569 0Z";
const MARK_RIGHT_PATH =
  "M417.412 727H206.438L394.48 286.672C405.946 259.152 412.825 231.631 412.825 199.524C412.825 128.021 368.243 35.2318 311.631 0C311.631 0 385.715 0 424.291 0C534.365 0 623.8 89.4419 623.8 199.524C623.8 231.631 616.92 259.152 605.454 286.672L417.412 727Z";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface AnimatedDittoMarkProps {
  className?: string;
  reducedMotion?: boolean;
}

export function AnimatedDittoMark({ className = "", reducedMotion: forceReducedMotion = false }: AnimatedDittoMarkProps) {
  const [systemReducedMotion, setSystemReducedMotion] = useState<boolean>(prefersReducedMotion);
  const reducedMotion = forceReducedMotion || systemReducedMotion;
  const uid = useId().replace(/:/g, "");

  useEffect(() => {
    if (typeof window === "undefined" || forceReducedMotion) {
      return;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event: MediaQueryListEvent) => setSystemReducedMotion(event.matches);
    setSystemReducedMotion(media.matches);

    if (media.addEventListener) {
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }

    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, [forceReducedMotion]);

  const clipId = `ditto-mark-clip-${uid}`;
  const bodyGradientId = `ditto-mark-body-${uid}`;
  const bodyLightId = `ditto-mark-body-light-${uid}`;
  const innerShadeId = `ditto-mark-inner-shade-${uid}`;
  const bevelLightId = `ditto-mark-bevel-light-${uid}`;
  const bevelShadeId = `ditto-mark-bevel-shade-${uid}`;
  const overlapAoId = `ditto-mark-overlap-ao-${uid}`;
  const sweepGradientId = `ditto-mark-specular-sweep-${uid}`;
  const sweepCoreId = `ditto-mark-specular-core-${uid}`;
  const bloomGradientId = `ditto-mark-specular-bloom-${uid}`;
  const depthFilterId = `ditto-mark-depth-${uid}`;
  const auraFilterId = `ditto-mark-aura-${uid}`;
  const aoBlurId = `ditto-mark-ao-blur-${uid}`;
  const bloomGlowId = `ditto-mark-bloom-glow-${uid}`;
  const rootClassName = [
    "animated-ditto-mark",
    reducedMotion ? "animated-ditto-mark--reduced" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClassName} aria-hidden="true">
      <svg viewBox="0 0 624 727" role="presentation" focusable="false">
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            <path d={MARK_LEFT_PATH} />
            <path d={MARK_RIGHT_PATH} />
          </clipPath>

          <linearGradient id={bodyGradientId} x1="0.03" y1="0.08" x2="0.97" y2="0.92">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.99" />
            <stop offset="20%" stopColor="#EBF0F6" stopOpacity="0.98" />
            <stop offset="44%" stopColor="#E7EFF4" stopOpacity="0.95" />
            <stop offset="66%" stopColor="#00B0FF" stopOpacity="0.56" />
            <stop offset="82%" stopColor="#073D5A" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#063149" stopOpacity="0.42" />
          </linearGradient>

          <radialGradient id={bodyLightId} cx="34%" cy="26%" r="74%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.64" />
            <stop offset="26%" stopColor="#EBF0F6" stopOpacity="0.34" />
            <stop offset="56%" stopColor="#E7EFF4" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#073D5A" stopOpacity="0" />
          </radialGradient>

          <linearGradient id={innerShadeId} x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.16" />
            <stop offset="28%" stopColor="#FFFFFF" stopOpacity="0.02" />
            <stop offset="62%" stopColor="#063149" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.33" />
          </linearGradient>

          <linearGradient id={bevelLightId} x1="0.02" y1="0.12" x2="0.58" y2="0.44">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.38" />
            <stop offset="30%" stopColor="#FFFFFF" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          <linearGradient id={bevelShadeId} x1="0.4" y1="0.62" x2="1" y2="1">
            <stop offset="0%" stopColor="#063149" stopOpacity="0" />
            <stop offset="48%" stopColor="#063149" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.32" />
          </linearGradient>

          <radialGradient id={overlapAoId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.34" />
            <stop offset="52%" stopColor="#063149" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#063149" stopOpacity="0" />
          </radialGradient>

          <linearGradient id={sweepGradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#063149" stopOpacity="0" />
            <stop offset="18%" stopColor="#073D5A" stopOpacity="0.08" />
            <stop offset="34%" stopColor="#095279" stopOpacity="0.24" />
            <stop offset="45%" stopColor="#E7EFF4" stopOpacity="0.66" />
            <stop offset="54%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="64%" stopColor="#E7EFF4" stopOpacity="0.68" />
            <stop offset="78%" stopColor="#095279" stopOpacity="0.24" />
            <stop offset="92%" stopColor="#063149" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#063149" stopOpacity="0" />
          </linearGradient>

          <linearGradient id={sweepCoreId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="30%" stopColor="#FFFFFF" stopOpacity="0.08" />
            <stop offset="48%" stopColor="#FFFFFF" stopOpacity="0.36" />
            <stop offset="58%" stopColor="#EBF0F6" stopOpacity="0.28" />
            <stop offset="72%" stopColor="#095279" stopOpacity="0.09" />
            <stop offset="100%" stopColor="#063149" stopOpacity="0" />
          </linearGradient>

          <linearGradient id={bloomGradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="34%" stopColor="#FFFFFF" stopOpacity="0.12" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.48" />
            <stop offset="64%" stopColor="#E7EFF4" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#063149" stopOpacity="0" />
          </linearGradient>

          <filter id={depthFilterId} x="-32%" y="-24%" width="172%" height="176%">
            <feDropShadow dx="0" dy="14" stdDeviation="18" floodColor="#000000" floodOpacity="0.24" />
            <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#063149" floodOpacity="0.24" />
          </filter>

          <filter id={auraFilterId} x="-40%" y="-28%" width="200%" height="184%">
            <feGaussianBlur stdDeviation="8.5" />
          </filter>

          <filter id={aoBlurId} x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="16" />
          </filter>

          <filter id={bloomGlowId} x="-180%" y="-140%" width="460%" height="360%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        <g className="animated-ditto-mark__depth" filter={`url(#${depthFilterId})`}>
          <path d={MARK_LEFT_PATH} fill="#000000" fillOpacity="0.26" transform="translate(0 9)" />
          <path d={MARK_RIGHT_PATH} fill="#000000" fillOpacity="0.26" transform="translate(0 9)" />
        </g>

        <g className="animated-ditto-mark__aura" filter={`url(#${auraFilterId})`}>
          <path d={MARK_LEFT_PATH} fill="#00B0FF" fillOpacity="0.06" transform="translate(0 3)" />
          <path d={MARK_RIGHT_PATH} fill="#00B0FF" fillOpacity="0.06" transform="translate(0 3)" />
        </g>

        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y="0" width="624" height="727" fill={`url(#${bodyGradientId})`} />
          <rect x="0" y="0" width="624" height="727" fill={`url(#${bodyLightId})`} opacity="0.86" />
          <rect x="0" y="0" width="624" height="727" fill={`url(#${innerShadeId})`} opacity="0.86" />
          <rect x="0" y="0" width="624" height="727" fill={`url(#${bevelLightId})`} opacity="0.72" />
          <rect x="0" y="0" width="624" height="727" fill={`url(#${bevelShadeId})`} opacity="0.78" />
          <ellipse
            cx="320"
            cy="356"
            rx="102"
            ry="86"
            fill={`url(#${overlapAoId})`}
            filter={`url(#${aoBlurId})`}
            opacity="0.78"
          />

          <rect
            className="animated-ditto-mark__specular-sweep"
            x={reducedMotion ? "-340" : "-1400"}
            y="0"
            width="2760"
            height="727"
            fill={`url(#${sweepGradientId})`}
          >
            {!reducedMotion ? (
              <animate
                attributeName="x"
                values="-1400; 760; -1400"
                keyTimes="0; 0.5; 1"
                dur="16.2s"
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.4 0 0.2 1;0.4 0 0.2 1"
              />
            ) : null}
          </rect>

          <rect
            className="animated-ditto-mark__specular-core"
            x={reducedMotion ? "-240" : "-1220"}
            y="0"
            width="1940"
            height="727"
            fill={`url(#${sweepCoreId})`}
          >
            {!reducedMotion ? (
              <animate
                attributeName="x"
                values="-1220; 840; -1220"
                keyTimes="0; 0.5; 1"
                dur="15.4s"
                begin="0.9s"
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.4 0 0.2 1;0.4 0 0.2 1"
              />
            ) : null}
          </rect>

          <rect
            className="animated-ditto-mark__specular-bloom"
            x={reducedMotion ? "-220" : "-920"}
            y="0"
            width="1140"
            height="727"
            fill={`url(#${bloomGradientId})`}
            filter={`url(#${bloomGlowId})`}
          >
            {!reducedMotion ? (
              <animate
                attributeName="x"
                values="-920; 900; -920"
                keyTimes="0; 0.5; 1"
                dur="16.2s"
                begin="0.3s"
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.4 0 0.2 1;0.4 0 0.2 1"
              />
            ) : null}
          </rect>
        </g>
      </svg>
    </div>
  );
}

export default AnimatedDittoMark;
