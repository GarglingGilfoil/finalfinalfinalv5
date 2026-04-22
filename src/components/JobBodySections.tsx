import { useMemo } from "react";

interface JobBodySectionsProps {
  html: string;
}

function normalizeAuthoredHtml(html: string): string {
  const documentParser = new DOMParser().parseFromString(html, "text/html");
  const children = Array.from(documentParser.body.children);
  const wrapper = document.createElement("div");

  for (const child of children) {
    const text = child.textContent?.replace(/\u00a0/g, " ").trim() ?? "";
    const strongOnlyHeading =
      child.tagName === "P" &&
      child.children.length === 1 &&
      child.firstElementChild?.tagName === "STRONG" &&
      text.length > 0;

    if (!text) {
      continue;
    }

    if (strongOnlyHeading) {
      const heading = document.createElement("h2");
      heading.textContent = text;
      wrapper.appendChild(heading);
      continue;
    }

    wrapper.appendChild(child.cloneNode(true));
  }

  return wrapper.innerHTML;
}

export function JobBodySections({ html }: JobBodySectionsProps): JSX.Element {
  const normalizedHtml = useMemo(() => normalizeAuthoredHtml(html), [html]);

  return (
    <section className="job-sheet__article-section">
      <div className="job-article">
        <div
          className="rich-text rich-text--body"
          dangerouslySetInnerHTML={{ __html: normalizedHtml }}
        />
      </div>
    </section>
  );
}
