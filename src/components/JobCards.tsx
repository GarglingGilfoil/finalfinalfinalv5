import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import type { JobRecommendation, JobViewData } from "../contracts/job-view";

interface FactGridProps {
  items: Array<{ label: string; value: string }>;
  className?: string;
}

interface TokenGroupProps {
  groups: Array<{
    title: string;
    items: string[];
  }>;
  className?: string;
}

interface CompanySummaryProps {
  job: JobViewData;
  className?: string;
}

interface RecommendedJobsProps {
  jobs: JobRecommendation[] | null;
}

interface OverflowChipListProps {
  defaultVisibleLimit: number;
  items: string[];
  title: string;
}

export function FactGrid({ items, className }: FactGridProps): JSX.Element {
  return (
    <dl className={["fact-grid", className].filter(Boolean).join(" ")}>
      {items.map((item) => (
        <div className="fact-grid__item" key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function useMediaQuery(query: string): boolean {
  const getMatches = (): boolean => window.matchMedia(query).matches;
  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const handleChange = (): void => {
      setMatches(mediaQueryList.matches);
    };

    handleChange();

    mediaQueryList.addEventListener("change", handleChange);
    return () => {
      mediaQueryList.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}

function fitsWithinRows(
  widths: number[],
  containerWidth: number,
  gap: number,
  maxRows: number
): boolean {
  if (!containerWidth) {
    return true;
  }

  let currentRow = 1;
  let usedWidth = 0;

  for (const width of widths) {
    const chipWidth = Math.min(Math.ceil(width), containerWidth);
    const nextWidth = usedWidth === 0 ? chipWidth : usedWidth + gap + chipWidth;

    if (nextWidth <= containerWidth + 0.5) {
      usedWidth = nextWidth;
      continue;
    }

    currentRow += 1;

    if (currentRow > maxRows) {
      return false;
    }

    usedWidth = chipWidth;
  }

  return true;
}

function getVisibleChipCount(
  widths: number[],
  overflowWidths: Map<number, number>,
  containerWidth: number,
  gap: number,
  maxVisibleCount: number
): number {
  const total = widths.length;
  const cappedTotal = Math.min(total, maxVisibleCount);

  if (total <= maxVisibleCount && fitsWithinRows(widths, containerWidth, gap, 2)) {
    return total;
  }

  for (let visibleCount = cappedTotal; visibleCount >= 0; visibleCount -= 1) {
    const hiddenCount = total - visibleCount;
    const overflowWidth = overflowWidths.get(hiddenCount);

    if (hiddenCount === 0) {
      if (fitsWithinRows(widths.slice(0, visibleCount), containerWidth, gap, 2)) {
        return visibleCount;
      }
      continue;
    }

    if (overflowWidth === undefined) {
      continue;
    }

    if (
      fitsWithinRows(
        [...widths.slice(0, visibleCount), overflowWidth],
        containerWidth,
        gap,
        2
      )
    ) {
      return visibleCount;
    }
  }

  return 0;
}

function OverflowChipList({
  defaultVisibleLimit,
  items,
  title
}: OverflowChipListProps): JSX.Element | null {
  const chipsRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const overflowId = useId();
  const isMobile = useMediaQuery("(max-width: 720px)");
  const [visibleCount, setVisibleCount] = useState(items.length);
  const [isOpen, setIsOpen] = useState(false);

  useLayoutEffect(() => {
    const chipsElement = chipsRef.current;
    const measureElement = measureRef.current;

    if (!chipsElement || !measureElement || items.length === 0) {
      setVisibleCount(items.length);
      return;
    }

    let animationFrame = 0;

    const measureOverflow = (): void => {
      const containerWidth = chipsElement.clientWidth;

      if (!containerWidth) {
        return;
      }

      const computedStyles = window.getComputedStyle(chipsElement);
      const gap = Number.parseFloat(computedStyles.columnGap || computedStyles.gap || "0");
      const itemWidths = Array.from(
        measureElement.querySelectorAll<HTMLElement>("[data-measure-item]")
      ).map((node) => Math.ceil(node.getBoundingClientRect().width));
      const overflowWidths = new Map<number, number>();

      Array.from(
        measureElement.querySelectorAll<HTMLElement>("[data-measure-overflow]")
      ).forEach((node) => {
        const hiddenCount = Number(node.dataset.measureOverflow);
        overflowWidths.set(hiddenCount, Math.ceil(node.getBoundingClientRect().width));
      });

      const nextVisibleCount = getVisibleChipCount(
        itemWidths,
        overflowWidths,
        containerWidth,
        gap,
        defaultVisibleLimit
      );

      setVisibleCount((current) => (current === nextVisibleCount ? current : nextVisibleCount));
    };

    const requestMeasure = (): void => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(measureOverflow);
    };

    requestMeasure();

    const resizeObserver = new ResizeObserver(() => {
      requestMeasure();
    });

    resizeObserver.observe(chipsElement);
    resizeObserver.observe(measureElement);

    if ("fonts" in document) {
      void document.fonts.ready.then(() => {
        requestMeasure();
      });
    }

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, [defaultVisibleLimit, items]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    if (!isMobile) {
      const handlePointerDown = (event: MouseEvent): void => {
        const target = event.target as Node;

        if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
          return;
        }

        setIsOpen(false);
      };

      document.addEventListener("mousedown", handlePointerDown);

      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.removeEventListener("mousedown", handlePointerDown);
      };
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMobile, isOpen]);

  useEffect(() => {
    if (visibleCount >= items.length && isOpen) {
      setIsOpen(false);
    }
  }, [isOpen, items.length, visibleCount]);

  if (!items.length) {
    return null;
  }

  const hiddenCount = Math.max(0, items.length - visibleCount);
  const visibleItems = hiddenCount > 0 ? items.slice(0, visibleCount) : items;
  const overflowLabel = `+${hiddenCount} more`;

  return (
    <div
      className={[
        "taxonomy-group__row",
        hiddenCount > 0 ? "taxonomy-group__row--with-overflow" : "",
        isOpen ? "taxonomy-group__row--overflow-open" : ""
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="taxonomy-group__title">{title}</p>

      <div className="taxonomy-group__chips-wrap">
        <div className="taxonomy-group__chips taxonomy-group__chips--clamped" ref={chipsRef} role="list">
          {visibleItems.map((item, index) => (
            <span
              className="taxonomy-chip"
              key={`${title}-${item}-${index}`}
              role="listitem"
              title={item}
            >
              {item}
            </span>
          ))}

          {hiddenCount > 0 ? (
            <button
              aria-controls={overflowId}
              aria-expanded={isOpen}
              aria-haspopup={isMobile ? undefined : "dialog"}
              className="taxonomy-chip taxonomy-chip--overflow"
              onClick={() => {
                setIsOpen((current) => !current);
              }}
              ref={triggerRef}
              type="button"
            >
              {overflowLabel}
            </button>
          ) : null}
        </div>

        <div className="taxonomy-group__measure" ref={measureRef} aria-hidden="true">
          <div className="taxonomy-group__chips taxonomy-group__chips--measure">
            {items.map((item, index) => (
              <span
                className="taxonomy-chip"
                data-measure-item
                key={`measure-${title}-${item}-${index}`}
                title={item}
              >
                {item}
              </span>
            ))}

            {Array.from({ length: items.length }, (_, index) => {
              const count = index + 1;

              return (
                <span
                  className="taxonomy-chip taxonomy-chip--overflow"
                  data-measure-overflow={count}
                  key={`measure-overflow-${title}-${count}`}
                >
                  +{count} more
                </span>
              );
            })}
          </div>
        </div>

        {hiddenCount > 0 && isOpen ? (
          <div
            aria-label={`All ${title.toLowerCase()}`}
            className={[
              "taxonomy-overflow",
              isMobile ? "taxonomy-overflow--inline" : "taxonomy-overflow--popover"
            ]
              .filter(Boolean)
              .join(" ")}
            id={overflowId}
            ref={panelRef}
            role={isMobile ? "region" : "dialog"}
          >
            <div className="taxonomy-overflow__header">
              <p>{title}</p>
              <button
                className="taxonomy-overflow__close"
                onClick={() => {
                  setIsOpen(false);
                }}
                type="button"
              >
                Show less
              </button>
            </div>

            <ul className="taxonomy-overflow__list">
              {items.map((item, index) => (
                <li key={`overflow-${title}-${item}-${index}`}>
                  <span className="taxonomy-overflow__chip">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TokenGroup({ groups, className }: TokenGroupProps): JSX.Element | null {
  const visibleGroups = groups.filter((group) => group.items.length > 0);

  if (!visibleGroups.length) {
    return null;
  }

  return (
    <div className={["taxonomy-group", className].filter(Boolean).join(" ")}>
      {visibleGroups.map((group) => {
        const normalizedTitle = group.title.toLowerCase();

        if (normalizedTitle === "industries") {
          return (
            <OverflowChipList
              defaultVisibleLimit={4}
              items={group.items}
              key={group.title}
              title={group.title}
            />
          );
        }

        if (normalizedTitle === "skills") {
          return (
            <OverflowChipList
              defaultVisibleLimit={6}
              items={group.items}
              key={group.title}
              title={group.title}
            />
          );
        }

        return (
          <div className="taxonomy-group__row" key={group.title}>
            <p className="taxonomy-group__title">{group.title}</p>
            <div className="taxonomy-group__chips" role="list">
              {group.items.map((item, index) => (
                <span
                  className="taxonomy-chip"
                  key={`${group.title}-${item}-${index}`}
                  role="listitem"
                  title={item}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getPlainTextFromHtml(html: string): string {
  const parsedDocument = new DOMParser().parseFromString(html, "text/html");
  return parsedDocument.body.textContent?.replace(/\u00a0/g, " ").trim() ?? "";
}

export function CompanySummary({ className, job }: CompanySummaryProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const descriptionText = useMemo(
    () => getPlainTextFromHtml(job.companyDescriptionHtml),
    [job.companyDescriptionHtml]
  );
  const canExpand = descriptionText.length > 175;

  return (
    <div className={["company-summary", className].filter(Boolean).join(" ")}>
      <div className="company-summary__copy">
        <p className="company-summary__label">About {job.companyName}</p>
        <p
          className={[
            "company-summary__text",
            canExpand && !isExpanded ? "company-summary__text--collapsed" : ""
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {descriptionText}
        </p>

        {canExpand ? (
          <button
            className="company-summary__read-more"
            onClick={() => {
              setIsExpanded((current) => !current);
            }}
            type="button"
          >
            {isExpanded ? "Show Less" : "Read More"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function RecommendedJobsSection({
  jobs
}: RecommendedJobsProps): JSX.Element | null {
  if (!jobs || jobs.length === 0) {
    return null;
  }

  return (
    <section className="recommended-jobs">
      <div className="recommended-jobs__header">
        <p className="section-kicker">More opportunities</p>
        <h2>Recommended jobs</h2>
      </div>

      <div className="recommended-jobs__grid">
        {jobs.map((job) => (
          <article className="surface-card surface-card--recommended" key={job.id}>
            <p className="recommended-jobs__company">{job.companyName}</p>
            <h3>{job.title}</h3>
            <dl className="recommended-jobs__facts">
              <div>
                <dt>Location</dt>
                <dd>{job.location}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{job.employmentType}</dd>
              </div>
              <div>
                <dt>Salary</dt>
                <dd>{job.salaryLabel}</dd>
              </div>
              <div>
                <dt>Posted</dt>
                <dd>{job.datePostedLabel}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
