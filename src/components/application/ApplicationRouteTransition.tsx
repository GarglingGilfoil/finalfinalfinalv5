import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import {
  getApplicationRouteKey,
  getApplicationTransitionEnterDuration,
  getApplicationTransitionExitDuration,
  inferApplicationTransitionDirection,
  type ApplicationTransitionDirection,
  type ApplicationTransitionPayload,
  type ApplicationTransitionSource,
  type ApplicationTransitionVariant
} from "../../lib/applicationFlow";
import { navigateTo, type AppRoute } from "../../lib/router";

type ApplicationRouteTransitionPhase = "idle" | "exiting" | "entering";

interface ApplicationTransitionToOptions<
  TPayload extends Record<string, unknown> = Record<string, unknown>
> {
  direction?: ApplicationTransitionDirection;
  variant?: ApplicationTransitionVariant;
  source?: ApplicationTransitionSource;
  payload?: TPayload;
  replace?: boolean;
}

interface ApplicationRouteTransitionMeta {
  direction: ApplicationTransitionDirection;
  phase: ApplicationRouteTransitionPhase;
  source?: ApplicationTransitionSource;
  variant: ApplicationTransitionVariant;
}

interface PendingTransitionMeta {
  direction: ApplicationTransitionDirection;
  entered?: boolean;
  source?: ApplicationTransitionSource;
  variant: ApplicationTransitionVariant;
}

export interface ApplicationRouteTransitionContextValue extends ApplicationRouteTransitionMeta {
  isTransitioning: boolean;
  routeKey: string;
  transitionTo: <TPayload extends Record<string, unknown> = Record<string, unknown>>(
    path: string,
    options?: ApplicationTransitionToOptions<TPayload>
  ) => void;
}

interface ApplicationRouteTransitionProviderProps {
  children: ReactNode;
  route: AppRoute;
}

interface ApplicationRouteTransitionProps {
  children: ReactNode;
  route: AppRoute;
}

const DEFAULT_TRANSITION_META: ApplicationRouteTransitionMeta = {
  direction: "neutral",
  phase: "idle",
  variant: "standard"
};

export const ApplicationRouteTransitionContext =
  createContext<ApplicationRouteTransitionContextValue | null>(null);

function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }

    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = (): void => {
      setReducedMotion(mediaQuery.matches);
    };

    update();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => {
        mediaQuery.removeEventListener("change", update);
      };
    }

    mediaQuery.addListener(update);
    return () => {
      mediaQuery.removeListener(update);
    };
  }, []);

  return reducedMotion;
}

function buildTransitionPayload<TPayload extends Record<string, unknown>>(
  payload: TPayload | undefined,
  meta: PendingTransitionMeta
): TPayload & ApplicationTransitionPayload {
  return {
    ...(payload ?? ({} as TPayload)),
    transitionAt: new Date().toISOString(),
    transitionDirection: meta.direction,
    transitionSource: meta.source,
    transitionVariant: meta.variant
  };
}

function isCurrentRoutePath(path: string): boolean {
  const nextUrl = new URL(path, window.location.origin);
  return nextUrl.pathname === window.location.pathname && nextUrl.search === window.location.search;
}

export function ApplicationRouteTransitionProvider({
  children,
  route
}: ApplicationRouteTransitionProviderProps): JSX.Element {
  const prefersReducedMotion = usePrefersReducedMotion();
  const routeKey = getApplicationRouteKey(route);
  const previousRouteRef = useRef<AppRoute>(route);
  const previousRouteKeyRef = useRef(routeKey);
  const pendingTransitionRef = useRef<PendingTransitionMeta | null>(null);
  const timersRef = useRef<number[]>([]);
  const [transitionMeta, setTransitionMeta] =
    useState<ApplicationRouteTransitionMeta>(DEFAULT_TRANSITION_META);

  const clearTransitionTimers = useCallback((): void => {
    timersRef.current.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    timersRef.current = [];
  }, []);

  const scheduleIdle = useCallback(
    (meta: PendingTransitionMeta): void => {
      const enterDuration = prefersReducedMotion
        ? 90
        : getApplicationTransitionEnterDuration(meta.direction, meta.variant);

      if (enterDuration === 0) {
        setTransitionMeta((currentMeta) => ({ ...currentMeta, phase: "idle" }));
        return;
      }

      const timerId = window.setTimeout(() => {
        setTransitionMeta((currentMeta) => ({ ...currentMeta, phase: "idle" }));
      }, enterDuration);
      timersRef.current.push(timerId);
    },
    [prefersReducedMotion]
  );

  const beginEnter = useCallback(
    (meta: PendingTransitionMeta): void => {
      if (meta.variant === "none") {
        setTransitionMeta({
          direction: meta.direction,
          phase: "idle",
          source: meta.source,
          variant: meta.variant
        });
        return;
      }

      setTransitionMeta({
        direction: meta.direction,
        phase: "entering",
        source: meta.source,
        variant: meta.variant
      });
      scheduleIdle(meta);
    },
    [scheduleIdle]
  );

  const transitionTo = useCallback(
    <TPayload extends Record<string, unknown> = Record<string, unknown>>(
      path: string,
      options: ApplicationTransitionToOptions<TPayload> = {}
    ): void => {
      if (isCurrentRoutePath(path)) {
        return;
      }

      clearTransitionTimers();

      const meta: PendingTransitionMeta = {
        direction: options.direction ?? "forward",
        source: options.source,
        variant: options.variant ?? "standard"
      };
      const payload = buildTransitionPayload(options.payload, meta);
      const shouldSkipExit =
        prefersReducedMotion || meta.variant === "handoff" || meta.variant === "none";

      const commitNavigation = (): void => {
        pendingTransitionRef.current = { ...meta, entered: true };
        navigateTo(path, {
          payload,
          replace: options.replace
        });
        beginEnter(meta);
      };

      if (shouldSkipExit) {
        commitNavigation();
        return;
      }

      setTransitionMeta({
        direction: meta.direction,
        phase: "exiting",
        source: meta.source,
        variant: meta.variant
      });

      const exitDuration = getApplicationTransitionExitDuration(meta.direction, meta.variant);
      const timerId = window.setTimeout(commitNavigation, exitDuration);
      timersRef.current.push(timerId);
    },
    [beginEnter, clearTransitionTimers, prefersReducedMotion]
  );

  useEffect(() => {
    const previousRouteKey = previousRouteKeyRef.current;

    if (previousRouteKey !== routeKey) {
      const pendingTransition = pendingTransitionRef.current;

      if (pendingTransition) {
        pendingTransitionRef.current = null;
        if (!pendingTransition.entered) {
          beginEnter(pendingTransition);
        }
      } else {
        beginEnter({
          direction: inferApplicationTransitionDirection(previousRouteRef.current, route),
          source: "browser-pop",
          variant: "standard"
        });
      }

      previousRouteRef.current = route;
      previousRouteKeyRef.current = routeKey;
    }
  }, [beginEnter, route, routeKey]);

  useEffect(() => {
    return () => {
      clearTransitionTimers();
    };
  }, [clearTransitionTimers]);

  const contextValue = useMemo<ApplicationRouteTransitionContextValue>(
    () => ({
      ...transitionMeta,
      isTransitioning: transitionMeta.phase !== "idle",
      routeKey,
      transitionTo
    }),
    [routeKey, transitionMeta, transitionTo]
  );

  return (
    <ApplicationRouteTransitionContext.Provider value={contextValue}>
      {children}
    </ApplicationRouteTransitionContext.Provider>
  );
}

export function ApplicationRouteTransition({
  children,
  route
}: ApplicationRouteTransitionProps): JSX.Element {
  const routeKey = getApplicationRouteKey(route);
  const transitionContext = useContext(ApplicationRouteTransitionContext);
  const phase = transitionContext?.phase ?? "idle";
  const direction = transitionContext?.direction ?? "neutral";
  const variant = transitionContext?.variant ?? "standard";
  const source = transitionContext?.source ?? "direct-entry";

  return (
    <div
      className="application-route-transition"
      data-direction={direction}
      data-phase={phase}
      data-source={source}
      data-variant={variant}
    >
      <span aria-hidden="true" className="application-route-transition__wash" />
      <div className="application-route-transition__content" key={routeKey}>
        {children}
      </div>
    </div>
  );
}
