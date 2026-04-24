import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { getJobView } from "../api/jobs";
import { ApplicationStepShell } from "../components/ApplicationStepShell";
import type {
  CandidateCareerHistoryState,
  CandidatePersonalDetailsState,
  CandidateResumeState,
  CandidateSession,
  PrototypeCareerEntry,
  PrototypeEducationEntry
} from "../contracts/application";
import type { JobViewData } from "../contracts/job-view";
import { readPrototypeSession } from "../lib/prototype-auth";
import { readPrototypeCareerHistoryState } from "../lib/prototype-career-history";
import { readPrototypePersonalDetailsState } from "../lib/prototype-personal-details";
import { readPrototypeResumeState } from "../lib/prototype-resume";
import {
  buildApplicationAuthPath,
  buildApplicationCareerHistoryPath,
  buildApplicationPersonalDetailsPath,
  buildApplicationUploadPath,
  buildJobViewPath,
  readNavigationState
} from "../lib/router";

interface ApplicationConfirmPageProps {
  jobId: string;
}

type LoadState = "loading" | "ready" | "missing";

interface ConfirmRoutePayload {
  transitionAt?: string;
  transitionSource?: "career-education-review";
}

interface SuccessParticle {
  className: string;
  style: CSSProperties;
}

function getCompanyMonogram(companyName: string): string {
  const words = companyName
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0]?.charAt(0) ?? ""}${words[1]?.charAt(0) ?? ""}`.toUpperCase();
  }

  return (words[0]?.slice(0, 2) || "DJ").toUpperCase();
}

function buildParticle(
  x: number,
  y: number,
  tx: number,
  ty: number,
  rotation: number,
  delay: number,
  duration: number,
  color: string,
  shape: "dot" | "sliver",
  size: number
): SuccessParticle {
  return {
    className: `application-success__particle application-success__particle--${shape}`,
    style: {
      "--particle-color": color,
      "--particle-duration": `${Math.round(duration * 2.25)}ms`,
      "--particle-delay": `${delay}ms`,
      "--particle-rotation": `${rotation}deg`,
      "--particle-size": `${size}px`,
      "--particle-tx": `${Math.round(tx * 1.5)}px`,
      "--particle-ty": `${Math.round(ty * 1.5)}px`,
      left: `${x}%`,
      top: `${y}%`
    } as CSSProperties
  };
}

const SUCCESS_PARTICLES: SuccessParticle[] = [
  buildParticle(50, 34, -170, -82, -28, 120, 780, "rgba(255, 255, 255, 0.92)", "sliver", 8),
  buildParticle(50, 35, -138, -112, 18, 150, 820, "rgba(179, 226, 248, 0.9)", "dot", 5),
  buildParticle(51, 34, -98, -132, 42, 170, 760, "rgba(8, 94, 139, 0.42)", "sliver", 7),
  buildParticle(49, 36, -72, -104, -12, 190, 850, "rgba(228, 246, 255, 0.95)", "dot", 4),
  buildParticle(51, 35, -36, -144, 66, 130, 840, "rgba(132, 205, 237, 0.8)", "sliver", 6),
  buildParticle(50, 35, 8, -126, -38, 160, 800, "rgba(255, 255, 255, 0.94)", "dot", 5),
  buildParticle(51, 34, 44, -152, 24, 180, 880, "rgba(210, 240, 252, 0.92)", "sliver", 8),
  buildParticle(50, 36, 84, -114, -56, 140, 790, "rgba(24, 181, 255, 0.42)", "dot", 4),
  buildParticle(51, 35, 126, -128, 38, 165, 840, "rgba(15, 41, 65, 0.32)", "sliver", 7),
  buildParticle(50, 35, 164, -78, -18, 185, 810, "rgba(242, 250, 255, 0.96)", "dot", 5),
  buildParticle(49, 37, -188, -18, 70, 220, 900, "rgba(179, 226, 248, 0.84)", "sliver", 7),
  buildParticle(51, 36, -148, 8, -44, 240, 840, "rgba(255, 255, 255, 0.9)", "dot", 4),
  buildParticle(50, 36, -116, 42, 16, 210, 860, "rgba(8, 94, 139, 0.36)", "sliver", 6),
  buildParticle(49, 35, -74, 70, -68, 260, 940, "rgba(228, 246, 255, 0.92)", "dot", 5),
  buildParticle(50, 36, -28, 88, 34, 230, 880, "rgba(132, 205, 237, 0.78)", "sliver", 7),
  buildParticle(51, 35, 18, 74, -24, 250, 900, "rgba(255, 255, 255, 0.92)", "dot", 4),
  buildParticle(50, 36, 62, 96, 58, 215, 920, "rgba(210, 240, 252, 0.88)", "sliver", 6),
  buildParticle(51, 36, 104, 62, -12, 245, 860, "rgba(24, 181, 255, 0.38)", "dot", 5),
  buildParticle(50, 35, 146, 24, 48, 225, 880, "rgba(15, 41, 65, 0.28)", "sliver", 8),
  buildParticle(51, 37, 184, -8, -36, 255, 900, "rgba(242, 250, 255, 0.94)", "dot", 4),
  buildParticle(50, 33, -122, -58, 28, 300, 760, "rgba(179, 226, 248, 0.78)", "sliver", 5),
  buildParticle(49, 34, -88, -84, -46, 335, 800, "rgba(255, 255, 255, 0.88)", "dot", 3),
  buildParticle(50, 34, -42, -98, 74, 315, 780, "rgba(24, 181, 255, 0.34)", "sliver", 5),
  buildParticle(51, 34, 32, -92, -18, 345, 820, "rgba(228, 246, 255, 0.88)", "dot", 4),
  buildParticle(50, 34, 82, -78, 38, 320, 800, "rgba(132, 205, 237, 0.72)", "sliver", 5),
  buildParticle(51, 35, 126, -42, -62, 350, 840, "rgba(255, 255, 255, 0.9)", "dot", 3),
  buildParticle(49, 36, -132, 28, 44, 380, 860, "rgba(210, 240, 252, 0.84)", "sliver", 6),
  buildParticle(50, 36, -82, 54, -26, 405, 820, "rgba(15, 41, 65, 0.24)", "dot", 4),
  buildParticle(51, 36, -18, 66, 64, 390, 850, "rgba(255, 255, 255, 0.88)", "sliver", 5),
  buildParticle(50, 36, 42, 58, -40, 420, 830, "rgba(179, 226, 248, 0.72)", "dot", 4),
  buildParticle(51, 36, 92, 36, 18, 400, 880, "rgba(24, 181, 255, 0.32)", "sliver", 6),
  buildParticle(50, 35, 142, 16, -74, 430, 840, "rgba(242, 250, 255, 0.9)", "dot", 3),
  buildParticle(49, 33, -210, -116, -34, 180, 900, "rgba(255, 255, 255, 0.9)", "dot", 4),
  buildParticle(50, 33, -174, -152, 52, 235, 880, "rgba(179, 226, 248, 0.82)", "sliver", 6),
  buildParticle(51, 33, -132, -174, -72, 260, 920, "rgba(228, 246, 255, 0.94)", "dot", 4),
  buildParticle(50, 32, -74, -188, 18, 210, 860, "rgba(24, 181, 255, 0.4)", "sliver", 7),
  buildParticle(51, 33, -12, -176, -46, 250, 900, "rgba(255, 255, 255, 0.92)", "dot", 5),
  buildParticle(50, 33, 54, -190, 78, 225, 940, "rgba(132, 205, 237, 0.76)", "sliver", 6),
  buildParticle(51, 33, 118, -168, -20, 270, 900, "rgba(210, 240, 252, 0.9)", "dot", 4),
  buildParticle(50, 34, 184, -134, 36, 245, 930, "rgba(15, 41, 65, 0.26)", "sliver", 7),
  buildParticle(49, 35, -222, -44, 62, 300, 980, "rgba(242, 250, 255, 0.92)", "sliver", 6),
  buildParticle(50, 35, -196, 36, -18, 340, 960, "rgba(179, 226, 248, 0.8)", "dot", 5),
  buildParticle(51, 35, 206, -42, 28, 315, 980, "rgba(255, 255, 255, 0.88)", "dot", 4),
  buildParticle(50, 36, 220, 34, -64, 355, 960, "rgba(24, 181, 255, 0.34)", "sliver", 6),
  buildParticle(49, 37, -168, 112, 44, 410, 1000, "rgba(228, 246, 255, 0.88)", "dot", 4),
  buildParticle(50, 37, -96, 134, -32, 445, 980, "rgba(132, 205, 237, 0.72)", "sliver", 5),
  buildParticle(51, 37, 94, 128, 58, 425, 1000, "rgba(255, 255, 255, 0.88)", "dot", 4),
  buildParticle(50, 37, 174, 104, -76, 455, 980, "rgba(210, 240, 252, 0.82)", "sliver", 6),
  buildParticle(49, 31, -236, -178, 26, 260, 1040, "rgba(255, 255, 255, 0.9)", "sliver", 7),
  buildParticle(50, 31, -184, -222, -54, 315, 1080, "rgba(179, 226, 248, 0.84)", "dot", 4),
  buildParticle(51, 31, -118, -236, 72, 350, 1020, "rgba(24, 181, 255, 0.42)", "sliver", 6),
  buildParticle(50, 30, -42, -252, -22, 300, 1060, "rgba(228, 246, 255, 0.94)", "dot", 5),
  buildParticle(51, 31, 42, -244, 42, 330, 1080, "rgba(132, 205, 237, 0.78)", "sliver", 7),
  buildParticle(50, 31, 122, -226, -68, 375, 1040, "rgba(255, 255, 255, 0.9)", "dot", 4),
  buildParticle(51, 32, 190, -190, 18, 340, 1100, "rgba(210, 240, 252, 0.9)", "sliver", 6),
  buildParticle(50, 32, 244, -142, -38, 390, 1060, "rgba(15, 41, 65, 0.24)", "dot", 4),
  buildParticle(49, 34, -270, -70, 64, 410, 1040, "rgba(242, 250, 255, 0.9)", "dot", 4),
  buildParticle(50, 34, -246, 18, -16, 455, 1100, "rgba(24, 181, 255, 0.36)", "sliver", 7),
  buildParticle(51, 34, 256, -16, 52, 430, 1060, "rgba(255, 255, 255, 0.88)", "sliver", 6),
  buildParticle(50, 35, 280, 70, -72, 475, 1080, "rgba(179, 226, 248, 0.8)", "dot", 5),
  buildParticle(49, 37, -238, 150, 34, 500, 1040, "rgba(228, 246, 255, 0.88)", "sliver", 6),
  buildParticle(50, 37, -176, 188, -48, 540, 1080, "rgba(132, 205, 237, 0.72)", "dot", 4),
  buildParticle(51, 37, -94, 214, 76, 520, 1100, "rgba(255, 255, 255, 0.88)", "sliver", 5),
  buildParticle(50, 38, -18, 230, -28, 565, 1040, "rgba(24, 181, 255, 0.34)", "dot", 4),
  buildParticle(51, 38, 68, 220, 46, 540, 1080, "rgba(210, 240, 252, 0.84)", "sliver", 6),
  buildParticle(50, 37, 148, 196, -62, 590, 1060, "rgba(242, 250, 255, 0.9)", "dot", 4),
  buildParticle(51, 37, 226, 152, 24, 560, 1100, "rgba(179, 226, 248, 0.78)", "sliver", 7),
  buildParticle(49, 35, -304, 8, -82, 585, 1080, "rgba(255, 255, 255, 0.86)", "dot", 3),
  buildParticle(51, 35, 304, 4, 82, 610, 1080, "rgba(24, 181, 255, 0.32)", "sliver", 6),
  buildParticle(50, 33, -266, -128, 12, 620, 1100, "rgba(210, 240, 252, 0.82)", "dot", 4),
  buildParticle(51, 33, 268, -122, -14, 600, 1100, "rgba(255, 255, 255, 0.88)", "dot", 4),
  buildParticle(50, 39, 0, 248, 88, 620, 1080, "rgba(132, 205, 237, 0.72)", "sliver", 6)
];

function buildPillBurstParticle(
  tx: number,
  ty: number,
  rotation: number,
  delay: number,
  duration: number,
  color: string,
  shape: "dot" | "sliver",
  size: number
): SuccessParticle {
  return {
    className: `application-success__pill-burst-particle application-success__pill-burst-particle--${shape}`,
    style: {
      "--burst-color": color,
      "--burst-delay": `${delay}ms`,
      "--burst-duration": `${duration}ms`,
      "--burst-rotation": `${rotation}deg`,
      "--burst-size": `${size}px`,
      "--burst-tx": `${tx}px`,
      "--burst-ty": `${ty}px`
    } as CSSProperties
  };
}

const APPLY_STATE_BURST_PARTICLES: SuccessParticle[] = [
  buildPillBurstParticle(-48, -22, -24, 0, 460, "rgba(255, 255, 255, 0.96)", "sliver", 5),
  buildPillBurstParticle(-36, -42, 38, 22, 500, "rgba(179, 226, 248, 0.94)", "dot", 4),
  buildPillBurstParticle(-12, -54, -64, 42, 440, "rgba(24, 181, 255, 0.52)", "sliver", 4),
  buildPillBurstParticle(18, -50, 22, 66, 480, "rgba(242, 250, 255, 0.96)", "dot", 4),
  buildPillBurstParticle(44, -34, 74, 30, 520, "rgba(132, 205, 237, 0.84)", "sliver", 5),
  buildPillBurstParticle(58, -10, -18, 78, 460, "rgba(255, 255, 255, 0.94)", "dot", 4),
  buildPillBurstParticle(46, 22, 42, 54, 500, "rgba(210, 240, 252, 0.92)", "sliver", 4),
  buildPillBurstParticle(20, 42, -52, 96, 480, "rgba(24, 181, 255, 0.46)", "dot", 4),
  buildPillBurstParticle(-16, 48, 68, 88, 520, "rgba(228, 246, 255, 0.94)", "dot", 4),
  buildPillBurstParticle(-44, 28, -36, 118, 460, "rgba(15, 41, 65, 0.28)", "sliver", 4),
  buildPillBurstParticle(-58, 0, 28, 104, 500, "rgba(179, 226, 248, 0.86)", "dot", 4),
  buildPillBurstParticle(62, 12, -72, 126, 520, "rgba(255, 255, 255, 0.92)", "sliver", 5),
  buildPillBurstParticle(-28, -58, 52, 92, 560, "rgba(210, 240, 252, 0.9)", "sliver", 4),
  buildPillBurstParticle(32, 56, -82, 134, 540, "rgba(24, 181, 255, 0.44)", "dot", 4),
  buildPillBurstParticle(-62, -12, 18, 46, 480, "rgba(242, 250, 255, 0.92)", "dot", 3),
  buildPillBurstParticle(-52, 44, -56, 142, 520, "rgba(132, 205, 237, 0.78)", "sliver", 4),
  buildPillBurstParticle(-4, 62, 82, 154, 500, "rgba(255, 255, 255, 0.9)", "dot", 3),
  buildPillBurstParticle(54, 38, -26, 166, 540, "rgba(179, 226, 248, 0.86)", "dot", 4),
  buildPillBurstParticle(10, -64, 44, 116, 520, "rgba(228, 246, 255, 0.9)", "sliver", 4),
  buildPillBurstParticle(64, -28, -74, 148, 560, "rgba(24, 181, 255, 0.4)", "sliver", 4),
  buildPillBurstParticle(-34, 56, 32, 178, 500, "rgba(255, 255, 255, 0.88)", "sliver", 4),
  buildPillBurstParticle(-66, -34, -48, 12, 500, "rgba(210, 240, 252, 0.9)", "dot", 3),
  buildPillBurstParticle(-50, -54, 64, 34, 540, "rgba(255, 255, 255, 0.92)", "sliver", 4),
  buildPillBurstParticle(-24, -66, -28, 58, 480, "rgba(179, 226, 248, 0.88)", "dot", 3),
  buildPillBurstParticle(2, -70, 86, 82, 520, "rgba(24, 181, 255, 0.42)", "sliver", 4),
  buildPillBurstParticle(28, -62, -62, 48, 500, "rgba(242, 250, 255, 0.94)", "dot", 3),
  buildPillBurstParticle(52, -48, 34, 72, 540, "rgba(132, 205, 237, 0.82)", "sliver", 4),
  buildPillBurstParticle(70, -18, -20, 96, 520, "rgba(255, 255, 255, 0.9)", "dot", 3),
  buildPillBurstParticle(66, 18, 58, 122, 480, "rgba(210, 240, 252, 0.86)", "sliver", 4),
  buildPillBurstParticle(48, 48, -84, 144, 540, "rgba(24, 181, 255, 0.4)", "dot", 3),
  buildPillBurstParticle(16, 68, 22, 172, 520, "rgba(255, 255, 255, 0.9)", "sliver", 4),
  buildPillBurstParticle(-18, 66, -38, 186, 500, "rgba(179, 226, 248, 0.84)", "dot", 3),
  buildPillBurstParticle(-48, 50, 76, 206, 540, "rgba(228, 246, 255, 0.9)", "sliver", 4),
  buildPillBurstParticle(-68, 20, -18, 224, 520, "rgba(255, 255, 255, 0.86)", "dot", 3),
  buildPillBurstParticle(-70, -8, 44, 242, 480, "rgba(24, 181, 255, 0.36)", "sliver", 4),
  buildPillBurstParticle(-12, -74, -76, 258, 520, "rgba(132, 205, 237, 0.78)", "dot", 3),
  buildPillBurstParticle(40, -58, 18, 276, 540, "rgba(255, 255, 255, 0.9)", "sliver", 4),
  buildPillBurstParticle(74, 4, -54, 294, 500, "rgba(210, 240, 252, 0.84)", "dot", 3),
  buildPillBurstParticle(34, 64, 92, 312, 540, "rgba(24, 181, 255, 0.36)", "sliver", 4),
  buildPillBurstParticle(-36, 62, -32, 330, 520, "rgba(242, 250, 255, 0.88)", "dot", 3),
  buildPillBurstParticle(-74, 2, 70, 348, 500, "rgba(179, 226, 248, 0.8)", "sliver", 4),
  buildPillBurstParticle(72, -30, -88, 366, 540, "rgba(255, 255, 255, 0.86)", "dot", 3)
];

function hasCompleteCareerEntry(entry: PrototypeCareerEntry): boolean {
  if (!entry.jobTitle.trim() || !entry.company.trim() || !entry.startMonth || !entry.startYear) {
    return false;
  }

  if (entry.isCurrent) {
    return true;
  }

  if (!entry.endMonth || !entry.endYear) {
    return false;
  }

  return Number(`${entry.startYear}${entry.startMonth}`) <= Number(`${entry.endYear}${entry.endMonth}`);
}

function hasCompleteEducationEntry(entry: PrototypeEducationEntry): boolean {
  return Boolean(
    entry.institution.trim() &&
      entry.qualification &&
      entry.startYear &&
      entry.endYear &&
      Number(entry.startYear) <= Number(entry.endYear)
  );
}

function isReviewReady(state: CandidateCareerHistoryState | null, sourceResumeId: string): boolean {
  if (!state) {
    return false;
  }

  if (state.sourceResumeId !== sourceResumeId) {
    return false;
  }

  return (
    state.careerEntries.every(hasCompleteCareerEntry) &&
    state.educationEntries.every(hasCompleteEducationEntry)
  );
}

function LoadingState(): JSX.Element {
  return (
    <div className="job-view__shell">
      <section className="application-auth">
        <div className="application-auth__layout surface-card skeleton skeleton--sheet" />
      </section>
    </div>
  );
}

function MissingState(): JSX.Element {
  return (
    <div className="job-view__shell">
      <section className="job-view__stack">
        <div className="surface-card surface-card--section">
          <p className="section-kicker">Unavailable</p>
          <h1>Application step not available</h1>
          <p className="muted-copy">We couldn’t resolve this role. Return to the job page and try again.</p>
        </div>
      </section>
    </div>
  );
}

function GuardState({ job }: { job: JobViewData }): JSX.Element {
  return (
    <div className="job-view__shell">
      <ApplicationStepShell>
        <section className="application-step__panel application-step__guard surface-card surface-card--section">
          <p className="section-kicker">Sign in required</p>
          <h1>Continue your application</h1>
          <p className="muted-copy">
            Sign in or create an account before you continue with your application for {job.title}.
          </p>
          <div className="application-step__guard-actions">
            <a className="button button--job-primary" href={buildApplicationAuthPath(job.id, "signin")}>
              Go to application sign in
            </a>
            <a className="button button--ghost" href={buildJobViewPath(job.id)}>
              Back to job view
            </a>
          </div>
        </section>
      </ApplicationStepShell>
    </div>
  );
}

function StepGuardState({
  actionHref,
  actionLabel,
  copy,
  kicker,
  title
}: {
  actionHref: string;
  actionLabel: string;
  copy: string;
  kicker: string;
  title: string;
}): JSX.Element {
  return (
    <div className="job-view__shell">
      <ApplicationStepShell>
        <section className="application-step__panel application-step__guard surface-card surface-card--section">
          <p className="section-kicker">{kicker}</p>
          <h1>{title}</h1>
          <p className="muted-copy">{copy}</p>
          <div className="application-step__guard-actions">
            <a className="button button--job-primary" href={actionHref}>
              {actionLabel}
            </a>
          </div>
        </section>
      </ApplicationStepShell>
    </div>
  );
}

function SuccessConfettiOverlay(): JSX.Element {
  return (
    <div aria-hidden="true" className="application-success__confetti">
      {SUCCESS_PARTICLES.map((particle, index) => (
        <span className={particle.className} key={index} style={particle.style} />
      ))}
    </div>
  );
}

function SuccessMark(): JSX.Element {
  return (
    <div aria-hidden="true" className="application-success__mark">
      <span className="application-success__mark-ripple" />
      <svg className="application-success__mark-svg" fill="none" viewBox="0 0 72 72">
        <circle className="application-success__mark-ring" cx="36" cy="36" r="27" />
        <path className="application-success__mark-check" d="M24.5 36.5 32.4 44.2 48.2 27.8" />
      </svg>
    </div>
  );
}

function SubmissionSealBadge(): JSX.Element {
  return (
    <div
      aria-label="Application status: Applied"
      className="application-success__pill"
      role="status"
    >
      <span aria-hidden="true" className="application-success__pill-burst">
        {APPLY_STATE_BURST_PARTICLES.map((particle, index) => (
          <span className={particle.className} key={index} style={particle.style} />
        ))}
      </span>
      <span aria-hidden="true" className="application-success__pill-track">
        <span className="application-success__pill-label application-success__pill-label--before">
          Apply
        </span>
        <span className="application-success__pill-label application-success__pill-label--after">
          <span className="application-success__pill-check">
            <svg aria-hidden="true" fill="none" viewBox="0 0 16 16">
              <path d="M4 8.2 6.7 11 12.2 5" />
            </svg>
          </span>
          Applied
        </span>
      </span>
    </div>
  );
}

function CompanyLogoMark({
  companyName,
  logoUrl
}: {
  companyName: string;
  logoUrl: string | null;
}): JSX.Element {
  const [logoFailed, setLogoFailed] = useState(false);
  const monogram = getCompanyMonogram(companyName);

  if (logoUrl && !logoFailed) {
    return (
      <span className="application-success__company-logo">
        <img
          alt={`${companyName} logo`}
          onError={() => setLogoFailed(true)}
          src={logoUrl}
        />
      </span>
    );
  }

  return (
    <span aria-label={companyName} className="application-success__company-logo application-success__company-logo--fallback">
      {monogram}
    </span>
  );
}

function ProfileCompletionCard({ jobId }: { jobId: string }): JSX.Element {
  const strengthenProfileHref = buildApplicationPersonalDetailsPath(jobId);

  return (
    <section className="application-success__profile-card" aria-labelledby="application-success-profile-title">
      <div className="application-success__profile-copy">
        <p className="section-kicker">Recommended next step</p>
        <h2 id="application-success-profile-title">Give recruiters the full picture</h2>
        <p>
          Your CV helped you apply. A fuller profile helps recruiters understand you faster.
        </p>
        <p>
          Add details like availability, work preferences, and contact information when you’re ready.
        </p>
        <div className="application-success__profile-actions">
          {/* Prototype-safe destination until the full candidate profile route exists. */}
          <a className="button button--job-primary" href={strengthenProfileHref}>
            Strengthen my profile
          </a>
          <a className="application-success__profile-secondary" href={buildJobViewPath(jobId)}>
            Back to job
          </a>
        </div>
      </div>
    </section>
  );
}

function ReadyState({
  job,
  resumeState,
  session
}: {
  job: JobViewData;
  resumeState: CandidateResumeState | null;
  session: CandidateSession | null;
}): JSX.Element {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const navigationState = useMemo(() => readNavigationState<ConfirmRoutePayload>(), []);
  const selectedResume = useMemo(
    () =>
      resumeState?.resumes.find((resume) => resume.id === resumeState.selectedResumeId) ?? null,
    [resumeState]
  );
  const personalDetailsState = useMemo<CandidatePersonalDetailsState | null>(
    () => (session ? readPrototypePersonalDetailsState(session, job.id) : null),
    [job.id, session]
  );
  const reviewState = useMemo<CandidateCareerHistoryState | null>(
    () => (session ? readPrototypeCareerHistoryState(session, job.id) : null),
    [job.id, session]
  );
  const successReady = Boolean(
    session &&
      selectedResume &&
      personalDetailsState?.status === "complete" &&
      isReviewReady(reviewState, selectedResume.id)
  );
  const firstName = session?.firstName?.trim() ?? "";
  const headline = firstName ? `Congratulations, ${firstName}.` : "Congratulations.";
  const jobTitle = job.title.trim() || "this role";
  const companyName = job.companyName.trim() || "the company";

  useEffect(() => {
    if (!successReady) {
      return undefined;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const focusTimer = window.setTimeout(
      () => {
        headingRef.current?.focus({ preventScroll: true });
      },
      prefersReducedMotion ? 0 : 1240
    );

    return () => {
      window.clearTimeout(focusTimer);
    };
  }, [successReady]);

  if (!session) {
    return <GuardState job={job} />;
  }

  if (!selectedResume) {
    return (
      <StepGuardState
        actionHref={buildApplicationUploadPath(job.id)}
        actionLabel="Back to resume upload"
        copy="Choose a resume before you complete this application profile."
        kicker="Resume required"
        title="Resume required"
      />
    );
  }

  if (personalDetailsState?.status !== "complete") {
    return (
      <StepGuardState
        actionHref={buildApplicationPersonalDetailsPath(job.id)}
        actionLabel="Go to personal details"
        copy="Add your location details before you complete this application profile."
        kicker="Personal details required"
        title="Personal details needed"
      />
    );
  }

  if (!isReviewReady(reviewState, selectedResume.id)) {
    return (
      <StepGuardState
        actionHref={buildApplicationCareerHistoryPath(job.id)}
        actionLabel="Review career and education"
        copy="Review the career and education details before this application profile is marked ready."
        kicker="Review required"
        title="Career and education needed"
      />
    );
  }

  return (
    <div className="job-view__shell">
      <ApplicationStepShell ambientMode="quiet">
        <section
          className="application-success application-step__panel"
          data-transition-source={navigationState?.payload?.transitionSource ?? "direct-entry"}
        >
          <SuccessConfettiOverlay />
          <div aria-hidden="true" className="application-success__ambient" />

          <section className="application-success__hero" aria-labelledby="application-success-title">
            <div className="application-success__hero-top">
              <SuccessMark />
            </div>

            <div className="application-success__copy">
              <p className="section-kicker application-success__status-label">Application sent</p>
              <h1
                className="application-success__headline"
                id="application-success-title"
                ref={headingRef}
                tabIndex={-1}
              >
                {headline}
              </h1>
              <p className="application-success__body">
                You’ve successfully applied to the {jobTitle} role at {companyName}.
              </p>
              <div
                aria-label={`Application for ${jobTitle} at ${companyName}`}
                className="application-success__submission-lockup"
              >
                <CompanyLogoMark companyName={companyName} logoUrl={job.companyLogoUrl} />
                <div className="application-success__submission-copy">
                  <p className="application-success__company-name">{companyName}</p>
                  <a
                    aria-label={`View ${jobTitle} job at ${companyName}`}
                    className="application-success__role-title"
                    href={buildJobViewPath(job.id)}
                  >
                    {jobTitle}
                  </a>
                </div>
                <SubmissionSealBadge />
              </div>
              <p className="application-success__supporting">
                Your application has been submitted and is now ready for review.
              </p>
            </div>

          </section>

          <ProfileCompletionCard jobId={job.id} />
        </section>
      </ApplicationStepShell>
    </div>
  );
}

export function ApplicationConfirmPage({ jobId }: ApplicationConfirmPageProps): JSX.Element {
  const [state, setState] = useState<LoadState>("loading");
  const [job, setJob] = useState<JobViewData | null>(null);
  const [session, setSession] = useState<CandidateSession | null>(null);
  const [resumeState, setResumeState] = useState<CandidateResumeState | null>(null);

  useEffect(() => {
    let cancelled = false;
    const prototypeSession = readPrototypeSession();

    setState("loading");
    setJob(null);
    setSession(prototypeSession);
    setResumeState(prototypeSession ? readPrototypeResumeState(prototypeSession.email) : null);

    getJobView(jobId).then((result) => {
      if (cancelled) {
        return;
      }

      if (!result) {
        setState("missing");
        return;
      }

      setJob(result);
      setState("ready");
    });

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  if (state === "loading") {
    return <LoadingState />;
  }

  if (state === "missing" || !job) {
    return <MissingState />;
  }

  return <ReadyState job={job} resumeState={resumeState} session={session} />;
}
