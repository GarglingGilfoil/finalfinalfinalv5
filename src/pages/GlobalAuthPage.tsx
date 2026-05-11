import { useEffect, useState } from "react";
import { ApplicationSignInForm } from "../components/ApplicationSignInForm";
import { ApplicationSignUpForm } from "../components/ApplicationSignUpForm";
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

  return (
    <section className="global-auth-page">
      <div className="global-auth-page__layout surface-card">
        <aside className="global-auth-page__context">
          <p className="section-kicker">Candidate account</p>
          <h1>Your profile, applications, and next moves in one place.</h1>
          <p>
            Sign in or create your profile to manage your details, files, and application progress.
          </p>
        </aside>

        <div className="global-auth-page__form">
          {mode === "signin" ? (
            <ApplicationSignInForm
              allowPasswordReset={false}
              onAuthSuccess={handleAuthSuccess}
              onModeChange={(nextMode) => updateMode(nextMode === "signup" ? "signup" : "signin")}
            />
          ) : (
            <ApplicationSignUpForm
              onAuthSuccess={handleAuthSuccess}
              onModeChange={(nextMode) => updateMode(nextMode === "signup" ? "signup" : "signin")}
            />
          )}
        </div>
      </div>
    </section>
  );
}
