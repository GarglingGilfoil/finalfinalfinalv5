import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ChevronDown, LogOut, Search, Settings, UserRound } from "lucide-react";
import { ApplicationLocationField, type ApplicationLocationValue } from "./ApplicationLocationField";
import { TransitionLink } from "./application/TransitionLink";
import { useApplicationRouteTransition } from "../hooks/useApplicationRouteTransition";
import { HOME_AUTH_REQUEST_EVENT, type HomeAuthRequestMode } from "../lib/home-auth-events";
import { buildPrototypeCandidateProfile } from "../lib/prototype-candidate-profile";
import { clearPrototypeSession, readPrototypeSession } from "../lib/prototype-auth";
import {
  buildApplicationAuthPath,
  buildCandidateProfilePath,
  buildJobSearchPath,
  buildJobViewPath
} from "../lib/router";

interface PageChromeHeaderProps {
  jobId?: string;
  showSearch?: boolean;
}

function buildInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.trim().toUpperCase() || "DU";
}

function requestHomeAuth(mode: HomeAuthRequestMode): void {
  window.dispatchEvent(
    new CustomEvent(HOME_AUTH_REQUEST_EVENT, {
      detail: {
        mode
      }
    })
  );
}

export function PageChromeHeader({
  jobId,
  showSearch = true
}: PageChromeHeaderProps): JSX.Element {
  const { transitionTo } = useApplicationRouteTransition();
  const [jobTitle, setJobTitle] = useState("");
  const [session, setSession] = useState(() => readPrototypeSession());
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const profile = useMemo(
    () => (session ? buildPrototypeCandidateProfile(session) : null),
    [session]
  );
  const [location, setLocation] = useState<ApplicationLocationValue | null>(
    () => profile?.location ?? null
  );
  const fullName = session ? `${session.firstName} ${session.lastName}`.trim() : "";
  const initials = buildInitials(session?.firstName ?? "", session?.lastName ?? "");

  useEffect(() => {
    const refreshSession = (): void => setSession(readPrototypeSession());

    window.addEventListener("storage", refreshSession);
    window.addEventListener("ditto-jobs:route-change", refreshSession);
    window.addEventListener("popstate", refreshSession);

    return () => {
      window.removeEventListener("storage", refreshSession);
      window.removeEventListener("ditto-jobs:route-change", refreshSession);
      window.removeEventListener("popstate", refreshSession);
    };
  }, []);

  useEffect(() => {
    setLocation((currentLocation) => currentLocation ?? profile?.location ?? null);
  }, [profile?.location]);

  useEffect(() => {
    if (!isUserMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent): void => {
      const target = event.target;

      if (target instanceof Node && userMenuRef.current?.contains(target)) {
        return;
      }

      setIsUserMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isUserMenuOpen]);

  useEffect(() => {
    if (!isMobileSearchOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsMobileSearchOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileSearchOpen]);

  const submitSearch = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const searchParams = new URLSearchParams();
    const trimmedTitle = jobTitle.trim();

    if (trimmedTitle) {
      searchParams.set("q", trimmedTitle);
    }

    if (location) {
      searchParams.set("location", location.label);
      searchParams.set("country", location.countryCode);
      searchParams.set("city", location.cityName);
    }

    setIsMobileSearchOpen(false);
    transitionTo(
      buildJobSearchPath({
        city: searchParams.get("city"),
        country: searchParams.get("country"),
        location: searchParams.get("location"),
        title: searchParams.get("q")
      }),
      {
      direction: "neutral",
      source: "header-search"
      }
    );
  };

  const handleLogout = (): void => {
    clearPrototypeSession();
    setSession(null);
    setIsUserMenuOpen(false);
    transitionTo(jobId ? buildJobViewPath(jobId) : "/", {
      direction: "back",
      source: "header-logout"
    });
  };

  return (
    <header className="site-header">
      <div className="site-header__inner" data-has-search={showSearch ? "true" : "false"}>
        <TransitionLink
          className="site-header__brand"
          direction="back"
          href="/"
          source="header-brand"
        >
          <img
            alt="Ditto Jobs"
            className="site-header__wordmark"
            src="/brand/ditto-wordmark.svg"
          />
        </TransitionLink>

        {showSearch ? (
          <form
            aria-label="Search jobs"
            className="site-header-search"
            data-mobile-open={isMobileSearchOpen || undefined}
            id="site-header-search"
            onSubmit={submitSearch}
          >
            <label className="site-header-search__keyword">
              <span className="sr-only">Job title, skill, or keyword</span>
              <input
                autoComplete="off"
                onChange={(event) => setJobTitle(event.target.value)}
                placeholder="Job title"
                type="search"
                value={jobTitle}
              />
            </label>
            <div className="site-header-search__location">
              <ApplicationLocationField
                cityPlaceholder="Location"
                countrySearchPlaceholder="Search country"
                label="Location"
                onChange={setLocation}
                value={location}
              />
            </div>
            <button
              aria-label="Search jobs"
              className="site-header-search__submit"
              type="submit"
            >
              <Search aria-hidden="true" />
              <span className="site-header-search__submit-label">Search</span>
            </button>
          </form>
        ) : null}

        <div className="site-header__nav-actions">
          {showSearch ? (
            <button
              aria-controls="site-header-search"
              aria-expanded={isMobileSearchOpen}
              aria-label={isMobileSearchOpen ? "Close job search" : "Open job search"}
              className="site-header__search-toggle"
              onClick={() => setIsMobileSearchOpen((current) => !current)}
              type="button"
            >
              <Search aria-hidden="true" />
            </button>
          ) : null}

          {session ? (
            <div className="site-header-user" ref={userMenuRef}>
              <button
                aria-expanded={isUserMenuOpen}
                aria-haspopup="menu"
                aria-label={`Open account menu for ${fullName}`}
                className="site-header-user__button"
                onClick={() => setIsUserMenuOpen((current) => !current)}
                type="button"
              >
                <span className="site-header-user__avatar">
                  {profile?.profilePicture?.dataUrl ? (
                    <img alt="" src={profile.profilePicture.dataUrl} />
                  ) : (
                    <span>{initials}</span>
                  )}
                </span>
                <span className="site-header-user__name">{fullName}</span>
                <ChevronDown aria-hidden="true" className="site-header-user__chevron" />
              </button>

              {isUserMenuOpen ? (
                <div className="site-header-user__menu" role="menu">
                  <TransitionLink
                    href={buildCandidateProfilePath()}
                    onClick={() => setIsUserMenuOpen(false)}
                    role="menuitem"
                    source="header-profile"
                  >
                    <UserRound aria-hidden="true" />
                    View Profile
                  </TransitionLink>
                  <TransitionLink
                    href={buildCandidateProfilePath()}
                    onClick={() => setIsUserMenuOpen(false)}
                    role="menuitem"
                    source="header-settings"
                  >
                    <Settings aria-hidden="true" />
                    Edit Settings
                  </TransitionLink>
                  <button onClick={handleLogout} role="menuitem" type="button">
                    <LogOut aria-hidden="true" />
                    Log Out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <nav aria-label="Account actions" className="site-header__actions">
              {jobId ? (
                <>
                  <TransitionLink
                    className="button button--ghost"
                    href={buildApplicationAuthPath(jobId, "signin")}
                    source="header-signin"
                  >
                    Log in
                  </TransitionLink>
                  <TransitionLink
                    className="button button--primary"
                    href={buildApplicationAuthPath(jobId, "signup")}
                    source="header-signup"
                  >
                    Sign up
                  </TransitionLink>
                </>
              ) : (
                <>
                  <button
                    className="button button--ghost"
                    onClick={() => requestHomeAuth("signin")}
                    type="button"
                  >
                    Log in
                  </button>
                  <button
                    className="button button--primary"
                    onClick={() => requestHomeAuth("signup")}
                    type="button"
                  >
                    Sign up
                  </button>
                </>
              )}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}

export function PageChromeFooter(): JSX.Element {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <img
          alt="Ditto Jobs"
          className="site-footer__wordmark"
          src="/brand/ditto-wordmark-footer.svg"
        />

        <p className="site-footer__copyright">
          © 2026 Ditto Jobs. All rights reserved.
        </p>

        <nav aria-label="Legal links" className="site-footer__links">
          <a href="https://www.ditto.jobs/legal/terms">Terms of Service</a>
          <a href="https://www.ditto.jobs/legal/privacy">Privacy Policy</a>
        </nav>
      </div>
    </footer>
  );
}
