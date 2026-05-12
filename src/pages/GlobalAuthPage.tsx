import { useEffect, useState } from "react";
import { ApplicationSignInForm } from "../components/ApplicationSignInForm";
import { ApplicationSignUpForm } from "../components/ApplicationSignUpForm";
import { ApplicationForgotPasswordForm } from "../components/ApplicationForgotPasswordForm";
import { useApplicationRouteTransition } from "../hooks/useApplicationRouteTransition";
import type { AuthProvider } from "../contracts/application";
import {
  buildGlobalAuthPath,
  buildCandidateProfilePath,
  getSafeAuthNextPath,
  isCanonicalGlobalAuthMode,
  navigateTo,
  type GlobalAuthRoute
} from "../lib/router";
import { buildPrototypeSession, readPrototypeSession, savePrototypeSession } from "../lib/prototype-auth";

interface GlobalAuthPageProps {
  initialMode: GlobalAuthRoute["mode"];
  nextPath?: string;
}

interface AuthSuccessInput {
  email: string;
  firstName?: string;
  lastName?: string;
  provider: AuthProvider;
  entryMode: "signin" | "signup";
}

function GenericAuthDittoMark(): JSX.Element {
  const bluePath =
    "M410.599 0H206.404L25.2271 431.155C9.17349 458.675 0 493.076 0 527.476C0 637.558 91.735 727 201.817 727C238.39 727 305.212 727 305.212 727C245.254 692.385 201.905 600.986 201.905 527.476C201.905 493.076 211.078 458.675 227.132 431.155L410.599 0Z";
  const whitePath =
    "M417.397 727H206.406L394.463 286.672C405.93 259.152 412.81 231.631 412.81 199.524C412.81 128.021 368.224 35.2318 311.608 0C311.608 0 385.697 0 424.277 0C534.359 0 623.801 89.4419 623.801 199.524C623.801 231.631 616.92 259.152 605.454 286.672L417.397 727Z";

  return (
    <span className="global-auth-page__brand-mark" aria-label="Ditto" role="img">
      <svg aria-hidden="true" focusable="false" viewBox="0 0 624 727">
        <path
          d={bluePath}
          fill="url(#global-auth-ditto-mark-blue)"
          fillRule="evenodd"
          clipRule="evenodd"
        />
        <path
          d={whitePath}
          fill="#F7FBFF"
          fillRule="evenodd"
          clipRule="evenodd"
        />
        <g clipPath="url(#global-auth-ditto-mark-clip)">
          <rect
            className="global-auth-page__brand-shimmer"
            x="-380"
            y="-130"
            width="210"
            height="990"
            fill="url(#global-auth-ditto-mark-shimmer)"
            transform="rotate(16 312 363.5)"
          >
            <animate
              attributeName="x"
              dur="3.6s"
              keyTimes="0;0.18;0.58;1"
              repeatCount="indefinite"
              values="-380;-380;790;790"
            />
          </rect>
        </g>
        <defs>
          <clipPath id="global-auth-ditto-mark-clip">
            <path d={bluePath} fillRule="evenodd" clipRule="evenodd" />
            <path d={whitePath} fillRule="evenodd" clipRule="evenodd" />
          </clipPath>
          <linearGradient
            id="global-auth-ditto-mark-blue"
            x1="91.8485"
            y1="727"
            x2="396.545"
            y2="-71.0478"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0.65263" stopColor="#00B0FF" />
            <stop offset="0.986642" stopColor="#71D5FF" />
          </linearGradient>
          <linearGradient id="global-auth-ditto-mark-shimmer" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="0.44" stopColor="#FFFFFF" stopOpacity="0.16" />
            <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.62" />
            <stop offset="0.58" stopColor="#74D5FF" stopOpacity="0.18" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}

function resolveGlobalAuthDestination(nextPath?: string): string {
  return nextPath ?? getSafeAuthNextPath(window.location.search) ?? buildCandidateProfilePath();
}

export function GlobalAuthPage({ initialMode, nextPath }: GlobalAuthPageProps): JSX.Element {
  const [mode, setMode] = useState<GlobalAuthRoute["mode"]>(initialMode);
  const { transitionTo } = useApplicationRouteTransition();

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (nextPath) {
      return;
    }

    if (isCanonicalGlobalAuthMode(window.location.search)) {
      return;
    }

    navigateTo(
      buildGlobalAuthPath(initialMode, {
        next: getSafeAuthNextPath(window.location.search)
      }),
      { replace: true }
    );
  }, [initialMode, nextPath]);

  useEffect(() => {
    if (!readPrototypeSession()) {
      return;
    }

    transitionTo(resolveGlobalAuthDestination(nextPath), {
      direction: "forward",
      replace: true,
      source: "guard-recovery"
    });
  }, [nextPath, transitionTo]);

  const updateMode = (nextMode: GlobalAuthRoute["mode"]): void => {
    setMode(nextMode);
    navigateTo(
      buildGlobalAuthPath(nextMode, {
        next: nextPath ?? getSafeAuthNextPath(window.location.search)
      })
    );
  };

  const handleAuthSuccess = async (input: AuthSuccessInput): Promise<void> => {
    const session = buildPrototypeSession(input);
    savePrototypeSession(session);
    transitionTo(resolveGlobalAuthDestination(nextPath), {
      direction: "forward",
      source: "auth-complete"
    });
  };
  const isForgotPassword = mode === "forgot-password";
  const isSignInContext = mode === "signin";
  const contextEyebrow = isForgotPassword
    ? "RESET YOUR PASSWORD"
    : isSignInContext
      ? "SIGN IN TO YOUR ACCOUNT"
      : "CREATE YOUR PROFILE";
  const contextHeading = isForgotPassword
    ? "Let’s get you back in."
    : isSignInContext
      ? "Sign in and get moving."
      : "Your next move starts here.";
  const contextCopy = isForgotPassword
    ? "Enter your email and we’ll send you a secure link to reset your password."
    : isSignInContext
      ? "Keep your profile up to date and discover top jobs from standout employers around the world."
      : "Build your profile once, keep it sharp, and discover standout roles from employers around the world.";

  return (
    <section className="global-auth-page">
      <div className="global-auth-page__layout surface-card" data-mode={mode}>
        <aside className="global-auth-page__context">
          <div className="global-auth-page__context-content">
            <GenericAuthDittoMark />
            <div className="global-auth-page__context-copy">
              <p className="section-kicker">{contextEyebrow}</p>
              <h1>{contextHeading}</h1>
              <p>{contextCopy}</p>
            </div>
          </div>
        </aside>

        <div className="global-auth-page__form">
          {mode === "signin" ? (
            <ApplicationSignInForm
              onAuthSuccess={handleAuthSuccess}
              onModeChange={(nextMode) =>
                updateMode(nextMode === "signup" || nextMode === "forgot-password" ? nextMode : "signin")
              }
            />
          ) : null}

          {mode === "signup" ? (
            <ApplicationSignUpForm
              onAuthSuccess={handleAuthSuccess}
              onModeChange={(nextMode) => updateMode(nextMode === "signup" ? "signup" : "signin")}
            />
          ) : null}

          {mode === "forgot-password" ? (
            <ApplicationForgotPasswordForm
              onModeChange={(nextMode) => updateMode(nextMode === "signup" ? "signup" : "signin")}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
