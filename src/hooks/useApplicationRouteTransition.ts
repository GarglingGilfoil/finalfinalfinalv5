import { useContext } from "react";
import {
  ApplicationRouteTransitionContext,
  type ApplicationRouteTransitionContextValue
} from "../components/application/ApplicationRouteTransition";

export function useApplicationRouteTransition(): ApplicationRouteTransitionContextValue {
  const context = useContext(ApplicationRouteTransitionContext);

  if (!context) {
    throw new Error(
      "useApplicationRouteTransition must be used inside ApplicationRouteTransitionProvider."
    );
  }

  return context;
}
