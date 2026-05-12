import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent
} from "react";
import {
  ArrowRight,
  FileUp,
  Search,
  Sparkles
} from "lucide-react";
import { readJobView } from "../api/jobs";
import { ApplicationLocationField, type ApplicationLocationValue } from "../components/ApplicationLocationField";
import { ResumeUploadSection } from "../components/ResumeUploadSection";
import { useApplicationRouteTransition } from "../hooks/useApplicationRouteTransition";
import {
  buildApplicationLocationValue,
  getLocationCountryByCode,
  getTopCitiesForCountry
} from "../lib/location-data";
import {
  detectPreferredLocationCountry,
  readBrowserLocationDetectionContext
} from "../lib/location-detection";
import {
  buildPrototypeSession,
  readPrototypeSession,
  savePrototypeSession
} from "../lib/prototype-auth";
import { buildPrototypeCandidateProfile } from "../lib/prototype-candidate-profile";
import { HOME_AUTH_REQUEST_EVENT, type HomeAuthRequestMode } from "../lib/home-auth-events";
import { buildJobSearchPath, REFERENCE_JOB_ID } from "../lib/router";
import type {
  CandidateResumeState,
  CandidateSession,
  PrototypeResumeRecord
} from "../contracts/application";

type HomeTabId = "search" | "smart-match" | "upload-cv";
type HomeVariant = "home-1" | "home-2";

interface HomeTab {
  description: string;
  id: HomeTabId;
  label: string;
  icon: typeof Search;
}

interface AuthGateState {
  mode: HomeAuthRequestMode;
  tab: Exclude<HomeTabId, "search">;
}

const SMART_MATCH_CHARACTER_LIMIT = 2000;
const SMART_MATCH_ROUTE_INTENT_LIMIT = 160;
const HOME_VARIANT_STORAGE_KEY = "ditto-jobs.home-variant";
const HOME_GUEST_SESSION: CandidateSession = {
  authenticated: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  email: "home-upload-guest@ditto.local",
  entryMode: "signin",
  firstName: "Ditto",
  lastName: "Candidate",
  provider: "email"
};

const HOME_TABS: readonly HomeTab[] = [
  {
    description: "Fast keyword search by title, skill, company, or location.",
    id: "search",
    label: "Direct Search",
    icon: Search
  },
  {
    description: "Describe your background and the kind of role you want next.",
    id: "smart-match",
    label: "Smart Match",
    icon: Sparkles
  },
  {
    description: "Upload a CV so Ditto can match your experience to roles.",
    id: "upload-cv",
    label: "CV Match",
    icon: FileUp
  }
];

const HOME_PANEL_COPY: Record<
  HomeTabId,
  {
    title: string;
    description: string;
  }
> = {
  search: {
    title: "Search jobs",
    description: "Search by role, skill, company, or location."
  },
  "smart-match": {
    title: "Describe what fits",
    description: "Tell Ditto what you want. We’ll shape the search."
  },
  "upload-cv": {
    title: "Match from your CV",
    description: "Upload your CV and find roles that fit your experience."
  }
};

const SMART_QUICK_CHIPS = [
  {
    label: "+ Current Title",
    text: "My current role is "
  },
  {
    label: "+ Years of Experience",
    text: "I have  years of experience in "
  },
  {
    label: "+ Preferred Location",
    text: "I am looking for roles in "
  },
  {
    label: "+ Key Skills",
    text: "My key skills include "
  },
  {
    label: "+ Education",
    text: "My education includes "
  }
] as const;

function readInitialHomeVariant(): HomeVariant {
  if (typeof window === "undefined") {
    return "home-1";
  }

  const queryVariant = new URLSearchParams(window.location.search).get("home");

  if (queryVariant === "2" || queryVariant === "home-2") {
    return "home-2";
  }

  if (queryVariant === "1" || queryVariant === "home-1") {
    return "home-1";
  }

  return window.localStorage.getItem(HOME_VARIANT_STORAGE_KEY) === "home-2" ? "home-2" : "home-1";
}

function buildNewYorkFallbackLocation(): ApplicationLocationValue {
  const country = getLocationCountryByCode("US");

  return {
    cityId: "home:fallback:new-york",
    cityName: "New York",
    countryCode: "US",
    countryFlag: country?.flag,
    countryLatitude: country?.latitude ?? undefined,
    countryLongitude: country?.longitude ?? undefined,
    countryName: "USA",
    label: "New York, USA",
    phoneCode: country?.phoneCode
  };
}

function resolveHomeDefaultLocation(session: CandidateSession | null): ApplicationLocationValue {
  if (session) {
    const profile = buildPrototypeCandidateProfile(session);

    if (profile.location?.cityName && profile.location.countryCode) {
      return profile.location;
    }
  }

  const detectedCountry = detectPreferredLocationCountry({
    ...readBrowserLocationDetectionContext(),
    fallbackCountryCode: "US"
  });

  if (detectedCountry.source === "fallback") {
    return buildNewYorkFallbackLocation();
  }

  const priorityCity = getTopCitiesForCountry(detectedCountry.country.isoCode, 1)[0];

  if (priorityCity) {
    return buildApplicationLocationValue(priorityCity);
  }

  return buildNewYorkFallbackLocation();
}

function appendSmartTemplate(currentValue: string, templateText: string): string {
  const trimmedValue = currentValue.trimEnd();
  const separator = trimmedValue ? "\n" : "";
  return `${trimmedValue}${separator}${templateText}`.slice(0, SMART_MATCH_CHARACTER_LIMIT);
}

function buildSmartMatchRouteIntent(description: string): string | null {
  const normalizedDescription = description.trim().replace(/\s+/g, " ");

  if (!normalizedDescription) {
    return null;
  }

  if (normalizedDescription.length <= SMART_MATCH_ROUTE_INTENT_LIMIT) {
    return normalizedDescription;
  }

  return `${normalizedDescription.slice(0, SMART_MATCH_ROUTE_INTENT_LIMIT - 3).trimEnd()}...`;
}

function HomeInlineAuthGate({
  mode,
  onComplete,
  onDismiss
}: {
  mode: HomeAuthRequestMode;
  onComplete: (mode: HomeAuthRequestMode) => void;
  onDismiss: () => void;
}): JSX.Element {
  return (
    <div className="home-auth-gate" role="status">
      <div>
        <strong>{mode === "signup" ? "Create your Ditto profile" : "Keep your match private"}</strong>
        <p>
          Sign in to save your CV and role preferences before Ditto matches you with roles.
        </p>
      </div>
      <div className="home-auth-gate__actions">
        <button className="button button--ghost" onClick={onDismiss} type="button">
          Not now
        </button>
        <button
          className="button button--primary"
          onClick={() => onComplete(mode)}
          type="button"
        >
          {mode === "signup" ? "Create profile" : "Sign in"}
        </button>
      </div>
    </div>
  );
}

export function HomePage(): JSX.Element {
  const { transitionTo } = useApplicationRouteTransition();
  const tabListId = useId();
  const [homeVariant, setHomeVariant] = useState<HomeVariant>(() => readInitialHomeVariant());
  const [session, setSession] = useState(() => readPrototypeSession());
  const [activeTab, setActiveTab] = useState<HomeTabId>("search");
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState<ApplicationLocationValue | null>(() =>
    resolveHomeDefaultLocation(readPrototypeSession())
  );
  const [smartDescription, setSmartDescription] = useState("");
  const [smartLoading, setSmartLoading] = useState(false);
  const [homeResumeState, setHomeResumeState] = useState<CandidateResumeState>({
    resumes: [],
    selectedResumeId: null
  });
  const [uploadLoadingLabel, setUploadLoadingLabel] = useState<string | null>(null);
  const [authGate, setAuthGate] = useState<AuthGateState | null>(null);
  const tabButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const homeJob = useMemo(() => readJobView(REFERENCE_JOB_ID), []);
  const uploadSession = session ?? HOME_GUEST_SESSION;

  const activeTabIndex = HOME_TABS.findIndex((tab) => tab.id === activeTab);
  const searchButtonLabel = "Search jobs";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(HOME_VARIANT_STORAGE_KEY, homeVariant);

    const nextUrl = new URL(window.location.href);

    if (homeVariant === "home-2") {
      nextUrl.searchParams.set("home", "2");
    } else {
      nextUrl.searchParams.delete("home");
    }

    window.history.replaceState(window.history.state, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
  }, [homeVariant]);

  useEffect(() => {
    const handleHomeAuthRequest = (event: Event): void => {
      const customEvent = event as CustomEvent<{ mode?: HomeAuthRequestMode }>;
      const mode = customEvent.detail?.mode === "signup" ? "signup" : "signin";
      setActiveTab("smart-match");
      setAuthGate({
        mode,
        tab: "smart-match"
      });
    };

    window.addEventListener(HOME_AUTH_REQUEST_EVENT, handleHomeAuthRequest);

    return () => {
      window.removeEventListener(HOME_AUTH_REQUEST_EVENT, handleHomeAuthRequest);
    };
  }, []);

  useEffect(() => {
    const refreshSession = (): void => {
      setSession(readPrototypeSession());
    };

    window.addEventListener("storage", refreshSession);
    window.addEventListener("ditto-jobs:route-change", refreshSession);

    return () => {
      window.removeEventListener("storage", refreshSession);
      window.removeEventListener("ditto-jobs:route-change", refreshSession);
    };
  }, []);

  const panelIds = useMemo(
    () =>
      HOME_TABS.reduce<Record<HomeTabId, string>>(
        (ids, tab) => ({
          ...ids,
          [tab.id]: `${tabListId}-${tab.id}-panel`
        }),
        {
          search: "",
          "smart-match": "",
          "upload-cv": ""
        }
      ),
    [tabListId]
  );

  function submitSearch(event?: FormEvent<HTMLFormElement>): void {
    event?.preventDefault();

    transitionTo(
      buildJobSearchPath({
        city: location?.cityName,
        country: location?.countryCode,
        location: location?.label,
        title: jobTitle
      }),
      {
        direction: "forward",
        source: "home-search",
        variant: "blur"
      }
    );
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    if (
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }

    event.preventDefault();
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? HOME_TABS.length - 1
          : (activeTabIndex + (event.key === "ArrowRight" ? 1 : -1) + HOME_TABS.length) %
            HOME_TABS.length;
    const nextTab = HOME_TABS[nextIndex];

    setActiveTab(nextTab.id);
    tabButtonRefs.current[nextIndex]?.focus();
  }

  function ensureAuthenticated(nextTab: Exclude<HomeTabId, "search">): boolean {
    if (session) {
      return true;
    }

    setAuthGate({
      mode: "signin",
      tab: nextTab
    });
    return false;
  }

  function completeMockAuth(mode: HomeAuthRequestMode): void {
    // TODO: Replace this prototype-only auth completion with the global auth modal/session flow.
    const nextSession = buildPrototypeSession({
      email: "candidate@example.com",
      firstName: "Daniel",
      lastName: "Adams",
      provider: "email",
      entryMode: mode === "signup" ? "signup" : "signin"
    });

    savePrototypeSession(nextSession);
    setSession(nextSession);
    setAuthGate(null);
    window.dispatchEvent(new Event("ditto-jobs:route-change"));
  }

  function runSmartMatch(): void {
    if (!ensureAuthenticated("smart-match")) {
      return;
    }

    setSmartLoading(true);

    // TODO: Replace this with the real Smart Match API once search matching is available.
    // TODO: Persist the full Smart Match description through backend session handoff.
    window.setTimeout(() => {
      setSmartLoading(false);
      transitionTo(
        buildJobSearchPath({
          city: location?.cityName,
          country: location?.countryCode,
          intent: buildSmartMatchRouteIntent(smartDescription),
          location: location?.label,
          source: "smart-match"
        }),
        {
          direction: "forward",
          payload: {
            smartMatchDescription: smartDescription
          },
          source: "home-smart-match"
        }
      );
    }, 900);
  }

  function runCvMatch(resume: PrototypeResumeRecord): void {
    if (!ensureAuthenticated("upload-cv")) {
      return;
    }

    setUploadLoadingLabel("Scanning your experience…");

    // TODO: Persist selected files through real auth/session handoff and send the selected resume to the CV matching service.
    window.setTimeout(() => {
      setUploadLoadingLabel("Matching your background to live roles…");
    }, 560);

    window.setTimeout(() => {
      setUploadLoadingLabel(null);
      transitionTo(
        buildJobSearchPath({
          city: location?.cityName,
          country: location?.countryCode,
          location: location?.label,
          source: "cv",
          state: "resume-selected"
        }),
        {
          direction: "forward",
          payload: {
            selectedResumeId: resume.id
          },
          source: "home-cv-match"
        }
      );
    }, 1180);
  }

  const renderModeTabs = (railClassName: string, modeClassName: string): JSX.Element => (
    <div
      aria-label="Choose how to start your job search"
      className={railClassName}
      role="tablist"
    >
      {HOME_TABS.map((tab, index) => {
        const Icon = tab.icon;
        const isActive = tab.id === activeTab;

        return (
          <button
            aria-controls={panelIds[tab.id]}
            aria-selected={isActive}
            aria-label={`${tab.label}: ${tab.description}`}
            className={modeClassName}
            id={`${tabListId}-${tab.id}-tab`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={handleTabKeyDown}
            ref={(node) => {
              tabButtonRefs.current[index] = node;
            }}
            role="tab"
            tabIndex={isActive ? 0 : -1}
            type="button"
          >
            <Icon aria-hidden="true" />
            <span>
              <strong>{tab.label}</strong>
            </span>
          </button>
        );
      })}
    </div>
  );

  const renderVariantToggle = (): JSX.Element => (
    <div className="home-variant-toggle" aria-label="Homepage variant">
      {([
        ["home-1", "Home 1"],
        ["home-2", "Home 2"]
      ] as const).map(([variant, label]) => (
        <button
          key={variant}
          aria-pressed={homeVariant === variant}
          className="home-variant-toggle__button"
          onClick={() => setHomeVariant(variant)}
          type="button"
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div className={`home-page ${homeVariant === "home-2" ? "home-page--variant-two" : "home-page--variant-one"}`}>
      {renderVariantToggle()}
      {homeVariant === "home-1" ? (
      <section className="home-hero" aria-labelledby="home-title">
        <span className="home-hero__shimmer" aria-hidden="true" />
        <div className="home-hero__copy">
          <h1 aria-label="Let’s get to work." id="home-title">
            <span aria-hidden="true" className="home-hero__headline-desktop">Let’s get to work.</span>
            <span aria-hidden="true" className="home-hero__headline-mobile">Let’s get</span>
            <span aria-hidden="true" className="home-hero__headline-mobile">to work.</span>
          </h1>
          <p>
            Start with a search, a sentence, or your CV.{" "}
            <span className="home-hero__desktop-break">Ditto brings the right roles closer.</span>
          </p>
        </div>

        <div className="home-search-card">
          {renderModeTabs("home-search-rail", "home-search-mode")}

          <div className="home-search-content">
            <div
              aria-labelledby={`${tabListId}-search-tab`}
              className="home-search-panel"
              hidden={activeTab !== "search"}
              id={panelIds.search}
              role="tabpanel"
            >
              <div className="home-search-panel__intro">
                <h2>{HOME_PANEL_COPY.search.title}</h2>
                <p>{HOME_PANEL_COPY.search.description}</p>
              </div>

              <form className="home-search-form" onSubmit={submitSearch}>
                <label className="home-field">
                  <span>Job title / keyword</span>
                  <input
                    autoComplete="off"
                    onChange={(event) => setJobTitle(event.target.value)}
                    placeholder="React Developer, Product Manager"
                    type="search"
                    value={jobTitle}
                  />
                </label>

                <div className="home-field home-field--location">
                  <ApplicationLocationField
                    cityPlaceholder="City, country, or remote"
                    countrySearchPlaceholder="Search country"
                    label="Location"
                    onChange={setLocation}
                    value={location}
                  />
                </div>

                <button className="button button--primary home-search-form__submit" type="submit">
                  {searchButtonLabel}
                  <ArrowRight aria-hidden="true" />
                </button>
              </form>
            </div>

            <div
              aria-labelledby={`${tabListId}-smart-match-tab`}
              className="home-search-panel"
              hidden={activeTab !== "smart-match"}
              id={panelIds["smart-match"]}
              role="tabpanel"
            >
              <div className="home-search-panel__intro">
                <h2>{HOME_PANEL_COPY["smart-match"].title}</h2>
                <p>{HOME_PANEL_COPY["smart-match"].description}</p>
              </div>

              <div className="home-smart-match">
                <label className="home-field">
                  <span>Describe your background</span>
                  <textarea
                    maxLength={SMART_MATCH_CHARACTER_LIMIT}
                    onChange={(event) => setSmartDescription(event.target.value)}
                    placeholder="I’m a React developer based in Cape Town with 5 years of experience. I’ve worked with TypeScript, Next.js, APIs and design systems. I’m looking for senior frontend roles, ideally hybrid or remote."
                    rows={7}
                    value={smartDescription}
                  />
                </label>
                <div className="home-smart-match__meta">
                  <span>The more detail you add, the better your matches.</span>
                  <span>
                    {smartDescription.length}/{SMART_MATCH_CHARACTER_LIMIT}
                  </span>
                </div>
                <div aria-label="Smart match writing helpers" className="home-quick-chips">
                  {SMART_QUICK_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      onClick={() =>
                        setSmartDescription((currentValue) =>
                          appendSmartTemplate(currentValue, chip.text)
                        )
                      }
                      type="button"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {authGate?.tab === "smart-match" ? (
                  <HomeInlineAuthGate
                    mode={authGate.mode}
                    onComplete={completeMockAuth}
                    onDismiss={() => setAuthGate(null)}
                  />
                ) : null}

                <button
                  className="button button--primary home-panel-cta"
                  disabled={smartLoading}
                  onClick={runSmartMatch}
                  type="button"
                >
                  {smartLoading ? "Finding your best matches…" : "Find matched jobs"}
                  <ArrowRight aria-hidden="true" />
                </button>
              </div>
            </div>

            <div
              aria-labelledby={`${tabListId}-upload-cv-tab`}
              className="home-search-panel"
              hidden={activeTab !== "upload-cv"}
              id={panelIds["upload-cv"]}
              role="tabpanel"
            >
              <div className="home-upload">
                {homeJob ? (
                  <ResumeUploadSection
                    continueLabel={uploadLoadingLabel ?? "Find jobs from my CV"}
                    heading={HOME_PANEL_COPY["upload-cv"].title}
                    isContinueBusy={Boolean(uploadLoadingLabel)}
                    job={homeJob}
                    lead={HOME_PANEL_COPY["upload-cv"].description}
                    onContinue={runCvMatch}
                    onResumeStateChange={setHomeResumeState}
                    resumeState={homeResumeState}
                    session={uploadSession}
                    showBackAction={false}
                    showCompanyHeading={false}
                    showContinueWhenEmpty={false}
                    showKicker={false}
                    variant="home"
                  />
                ) : null}

                {authGate?.tab === "upload-cv" ? (
                  <HomeInlineAuthGate
                    mode={authGate.mode}
                    onComplete={completeMockAuth}
                    onDismiss={() => setAuthGate(null)}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
      ) : (
        <section
          className="home-two"
          aria-labelledby="home-title"
        >
          <div className="home-two__background" aria-hidden="true">
            <span className="home-two__glow home-two__glow--primary" />
            <span className="home-two__glow home-two__glow--secondary" />
            <span className="home-two__aurora home-two__aurora--one" />
            <span className="home-two__aurora home-two__aurora--two" />
            <span className="home-two__orbital-glow" />
            <span className="home-two__grid" />
          </div>

          <div className="home-two__copy">
            <h1 aria-label="Let’s get to work." id="home-title">
              <span aria-hidden="true">Let’s get to work.</span>
            </h1>
            <p>
              Start with a search, a sentence, or your CV.{" "}
              <span className="home-hero__desktop-break">Ditto brings the right roles closer.</span>
            </p>
          </div>

          <div className="home-two__instrument">
            {renderModeTabs("home-two__segments", "home-two__segment")}

            <div className="home-two__panels">
              <div
                aria-labelledby={`${tabListId}-search-tab`}
                className="home-two__panel"
                hidden={activeTab !== "search"}
                id={panelIds.search}
                role="tabpanel"
              >
                <form className="home-two__lens" onSubmit={submitSearch}>
                  <label className="home-two__field home-two__field--role">
                    <span>Role or keyword</span>
                    <input
                      autoComplete="off"
                      onChange={(event) => setJobTitle(event.target.value)}
                      placeholder="Role, skill, or company"
                      type="search"
                      value={jobTitle}
                    />
                  </label>

                  <div className="home-two__divider" aria-hidden="true" />

                  <div className="home-two__field home-two__field--location">
                    <ApplicationLocationField
                      cityPlaceholder="City or country"
                      countrySearchPlaceholder="Search country"
                      label="Location"
                      onChange={setLocation}
                      value={location}
                    />
                  </div>

                  <button className="button button--primary home-two__submit" type="submit">
                    Search
                    <ArrowRight aria-hidden="true" />
                  </button>
                </form>
              </div>

              <div
                aria-labelledby={`${tabListId}-smart-match-tab`}
                className="home-two__panel"
                hidden={activeTab !== "smart-match"}
                id={panelIds["smart-match"]}
                role="tabpanel"
              >
                <div className="home-two__natural-search">
                  <label className="home-two__field home-two__field--natural">
                    <span>Smart Match</span>
                    <textarea
                      maxLength={SMART_MATCH_CHARACTER_LIMIT}
                      onChange={(event) => setSmartDescription(event.target.value)}
                      placeholder="Describe the role you want, the stack you use, or where you want to work."
                      rows={4}
                      value={smartDescription}
                    />
                  </label>
                  <div className="home-two__natural-footer">
                    <span>{smartDescription.length}/{SMART_MATCH_CHARACTER_LIMIT}</span>
                    <button
                      className="button button--primary home-two__submit"
                      disabled={smartLoading}
                      onClick={runSmartMatch}
                      type="button"
                    >
                      {smartLoading ? "Finding…" : "Find matches"}
                      <ArrowRight aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div aria-label="Smart match writing helpers" className="home-two__chips">
                  {SMART_QUICK_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      onClick={() =>
                        setSmartDescription((currentValue) =>
                          appendSmartTemplate(currentValue, chip.text)
                        )
                      }
                      type="button"
                    >
                      {chip.label.replace("+ ", "")}
                    </button>
                  ))}
                </div>

                {authGate?.tab === "smart-match" ? (
                  <HomeInlineAuthGate
                    mode={authGate.mode}
                    onComplete={completeMockAuth}
                    onDismiss={() => setAuthGate(null)}
                  />
                ) : null}
              </div>

              <div
                aria-labelledby={`${tabListId}-upload-cv-tab`}
                className="home-two__panel"
                hidden={activeTab !== "upload-cv"}
                id={panelIds["upload-cv"]}
                role="tabpanel"
              >
                <div className="home-two__upload">
                  {homeJob ? (
                    <ResumeUploadSection
                      continueLabel={uploadLoadingLabel ?? "Match my CV"}
                      heading="Let your CV search for you."
                      isContinueBusy={Boolean(uploadLoadingLabel)}
                      job={homeJob}
                      lead="Upload your CV and Ditto will match your experience to relevant roles."
                      onContinue={runCvMatch}
                      onResumeStateChange={setHomeResumeState}
                      resumeState={homeResumeState}
                      session={uploadSession}
                      showBackAction={false}
                      showCompanyHeading={false}
                      showContinueWhenEmpty={false}
                      showKicker={false}
                      variant="home"
                    />
                  ) : null}

                  {authGate?.tab === "upload-cv" ? (
                    <HomeInlineAuthGate
                      mode={authGate.mode}
                      onComplete={completeMockAuth}
                      onDismiss={() => setAuthGate(null)}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
