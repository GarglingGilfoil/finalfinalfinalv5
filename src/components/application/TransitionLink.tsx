import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import type {
  ApplicationTransitionDirection,
  ApplicationTransitionSource,
  ApplicationTransitionVariant
} from "../../lib/applicationFlow";
import { useApplicationRouteTransition } from "../../hooks/useApplicationRouteTransition";

interface TransitionLinkProps<TPayload extends Record<string, unknown> = Record<string, unknown>>
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick"> {
  children: ReactNode;
  direction?: ApplicationTransitionDirection;
  href: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  payload?: TPayload;
  replace?: boolean;
  source?: ApplicationTransitionSource;
  variant?: ApplicationTransitionVariant;
}

function shouldLetBrowserHandleClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey
  );
}

export function TransitionLink<TPayload extends Record<string, unknown> = Record<string, unknown>>({
  children,
  direction = "forward",
  href,
  onClick,
  payload,
  replace,
  source,
  target,
  variant = "standard",
  ...anchorProps
}: TransitionLinkProps<TPayload>): JSX.Element {
  const { transitionTo } = useApplicationRouteTransition();

  return (
    <a
      {...anchorProps}
      href={href}
      onClick={(event) => {
        onClick?.(event);

        if (
          shouldLetBrowserHandleClick(event) ||
          target === "_blank" ||
          anchorProps.download !== undefined
        ) {
          return;
        }

        const nextUrl = new URL(href, window.location.origin);

        if (nextUrl.origin !== window.location.origin) {
          return;
        }

        event.preventDefault();
        transitionTo(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`, {
          direction,
          payload,
          replace,
          source,
          variant
        });
      }}
      target={target}
    >
      {children}
    </a>
  );
}
