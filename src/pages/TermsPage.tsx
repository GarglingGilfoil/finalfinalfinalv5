import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { termsDocument, type LegalClause } from "../data/legal/terms";

function getAppShell(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".app-shell");
}

function getHeaderOffset(): number {
  const rawHeight = getComputedStyle(document.documentElement)
    .getPropertyValue("--header-height")
    .trim();
  const parsedHeight = Number.parseFloat(rawHeight);
  return Number.isFinite(parsedHeight) ? parsedHeight : 76;
}

function getTermsScrollOffset(): number {
  const mobileNav = document.querySelector<HTMLElement>(".legal-page__nav-panel");
  const shouldIncludeMobileNav =
    window.matchMedia("(max-width: 900px)").matches && mobileNav;

  return getHeaderOffset() + (shouldIncludeMobileNav ? mobileNav.offsetHeight : 0) + 24;
}

function scrollToTermsSection(sectionId: string): void {
  const target = document.getElementById(sectionId);
  const appShell = getAppShell();

  if (!target || !appShell) {
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const targetTop =
    target.getBoundingClientRect().top -
    appShell.getBoundingClientRect().top +
    appShell.scrollTop -
    getTermsScrollOffset();

  appShell.scrollTo({
    top: Math.max(targetTop, 0),
    behavior: prefersReducedMotion ? "auto" : "smooth"
  });
}

function isTermsSectionTargetReached(sectionId: string): boolean {
  const target = document.getElementById(sectionId);
  const appShell = getAppShell();

  if (!target || !appShell) {
    return true;
  }

  const targetTop = target.getBoundingClientRect().top - appShell.getBoundingClientRect().top;
  return Math.abs(targetTop - getTermsScrollOffset()) <= 18;
}

function renderLegalClause(clause: LegalClause): JSX.Element {
  const listStyle = clause.listStyle ?? "alpha";

  return (
    <div className="legal-clause" key={clause.id}>
      <span className="legal-clause__number">{clause.number}</span>
      <div className="legal-clause__content">
        {clause.paragraphs?.map((paragraph, index) => (
          <p key={`${clause.id}-paragraph-${index}`}>{paragraph}</p>
        ))}
        {clause.list ? (
          <ol className={`legal-clause__list legal-clause__list--${listStyle}`}>
            {clause.list.map((item, index) => (
              <li key={`${clause.id}-item-${index}`}>{item}</li>
            ))}
          </ol>
        ) : null}
        {clause.address ? (
          <address>
            {clause.address.map((line, index) => (
              <span key={`${clause.id}-address-${index}`}>{line}</span>
            ))}
          </address>
        ) : null}
      </div>
    </div>
  );
}

export function TermsPage(): JSX.Element {
  const termsSections = termsDocument.sections;
  const [activeSectionId, setActiveSectionId] = useState(termsSections[0]?.id ?? "");
  const sectionIds = useMemo(() => termsSections.map((section) => section.id), []);
  const programmaticScrollRef = useRef(false);
  const pendingSectionIdRef = useRef<string | null>(null);
  const programmaticScrollTimeoutRef = useRef<number | null>(null);

  const clearProgrammaticScrollTimeout = (): void => {
    if (programmaticScrollTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(programmaticScrollTimeoutRef.current);
    programmaticScrollTimeoutRef.current = null;
  };

  const releaseProgrammaticScrollLock = (): void => {
    programmaticScrollRef.current = false;
    pendingSectionIdRef.current = null;
    clearProgrammaticScrollTimeout();
  };

  const beginProgrammaticScroll = (sectionId: string): void => {
    clearProgrammaticScrollTimeout();
    programmaticScrollRef.current = true;
    pendingSectionIdRef.current = sectionId;
    setActiveSectionId(sectionId);

    programmaticScrollTimeoutRef.current = window.setTimeout(() => {
      releaseProgrammaticScrollLock();
    }, 1200);
  };

  useEffect(() => {
    const previousTitle = document.title;
    const description =
      "Candidate-facing terms for using Ditto Jobs, profiles, applications, CV uploads, job widgets, career pages, and related Ditto services.";
    const existingDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = existingDescription?.getAttribute("content") ?? null;
    const descriptionElement = existingDescription ?? document.createElement("meta");

    document.title = termsDocument.title;

    if (!existingDescription) {
      descriptionElement.setAttribute("name", "description");
      document.head.appendChild(descriptionElement);
    }

    descriptionElement.setAttribute("content", description);

    return () => {
      document.title = previousTitle;

      if (previousDescription === null && !existingDescription) {
        descriptionElement.remove();
      } else if (previousDescription !== null) {
        descriptionElement.setAttribute("content", previousDescription);
      }
    };
  }, [termsDocument.title]);

  useEffect(() => {
    const appShell = getAppShell();

    if (!appShell) {
      return undefined;
    }

    let animationFrameId = 0;

    const updateActiveSection = (): void => {
      if (programmaticScrollRef.current) {
        const pendingSectionId = pendingSectionIdRef.current;

        if (pendingSectionId && isTermsSectionTargetReached(pendingSectionId)) {
          setActiveSectionId(pendingSectionId);
          releaseProgrammaticScrollLock();
        }

        return;
      }

      const activationOffset = getTermsScrollOffset() + 12;
      const activeSection = sectionIds.reduce<string | null>((currentActiveId, sectionId) => {
        const sectionElement = document.getElementById(sectionId);

        if (!sectionElement) {
          return currentActiveId;
        }

        const sectionTop =
          sectionElement.getBoundingClientRect().top - appShell.getBoundingClientRect().top;

        return sectionTop <= activationOffset ? sectionId : currentActiveId;
      }, sectionIds[0] ?? null);

      if (activeSection) {
        setActiveSectionId(activeSection);
      }
    };

    const handleScroll = (): void => {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = window.requestAnimationFrame(updateActiveSection);
    };

    const handleManualScrollIntent = (): void => {
      if (programmaticScrollRef.current) {
        releaseProgrammaticScrollLock();
      }
    };

    updateActiveSection();
    appShell.addEventListener("scroll", handleScroll, { passive: true });
    appShell.addEventListener("wheel", handleManualScrollIntent, { passive: true });
    appShell.addEventListener("touchstart", handleManualScrollIntent, { passive: true });
    window.addEventListener("resize", handleScroll);
    window.addEventListener("keydown", handleManualScrollIntent);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      appShell.removeEventListener("scroll", handleScroll);
      appShell.removeEventListener("wheel", handleManualScrollIntent);
      appShell.removeEventListener("touchstart", handleManualScrollIntent);
      window.removeEventListener("resize", handleScroll);
      window.removeEventListener("keydown", handleManualScrollIntent);
      clearProgrammaticScrollTimeout();
    };
  }, [sectionIds]);

  useEffect(() => {
    const hashSectionId = window.location.hash.replace("#", "");

    if (!sectionIds.includes(hashSectionId)) {
      return;
    }

    window.setTimeout(() => {
      beginProgrammaticScroll(hashSectionId);
      scrollToTermsSection(hashSectionId);
    }, 80);
  }, [sectionIds]);

  useEffect(() => {
    const activeNavItem = document.querySelector<HTMLElement>(
      `.legal-page__nav-link[data-section-id="${activeSectionId}"]`
    );
    const navPanel = document.querySelector<HTMLElement>(".legal-page__nav-panel");

    if (!activeNavItem || !navPanel) {
      return;
    }

    const targetLeft =
      activeNavItem.offsetLeft - (navPanel.clientWidth - activeNavItem.offsetWidth) / 2;

    if (Math.abs(navPanel.scrollLeft - targetLeft) < 4) {
      return;
    }

    navPanel.scrollTo({
      left: Math.max(targetLeft, 0),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
    });
  }, [activeSectionId]);

  const handleSectionClick = (event: MouseEvent<HTMLAnchorElement>, sectionId: string): void => {
    event.preventDefault();
    beginProgrammaticScroll(sectionId);
    window.history.replaceState(window.history.state, "", `/terms#${sectionId}`);
    scrollToTermsSection(sectionId);
  };

  return (
    <article className="legal-page">
      <header className="legal-page__hero">
        <p className="legal-page__eyebrow">Legal</p>
        <h1>{termsDocument.title}</h1>
        <p>{termsDocument.subtitle}</p>
        <span>Last Updated: {termsDocument.lastUpdated}</span>
      </header>

      <div className="legal-page__layout">
        <aside className="legal-page__nav-panel">
          <nav aria-label="Terms sections" className="legal-page__nav">
            {termsSections.map((section) => (
              <a
                aria-current={activeSectionId === section.id ? "location" : undefined}
                href={`#${section.id}`}
                className="legal-page__nav-link"
                data-section-id={section.id}
                key={section.id}
                onClick={(event) => handleSectionClick(event, section.id)}
              >
                <span>{section.number}.</span>
                {section.title}
              </a>
            ))}
          </nav>
        </aside>

        <div className="legal-page__content" aria-label="Ditto Terms of Service sections">
          {termsSections.map((section) => (
            <section className="legal-section" id={section.id} key={section.id}>
              <span className="legal-section__number">{section.number}</span>
              <h2>{section.title}</h2>
              <div className="legal-section__body">
                {section.clauses.map((clause) => renderLegalClause(clause))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
