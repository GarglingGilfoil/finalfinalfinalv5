import { useState, type FormEvent } from "react";
import type { ApplicationAuthMode } from "../contracts/application";
import { AuthTextField } from "./ApplicationAuthPrimitives";

interface ApplicationForgotPasswordFormProps {
  onModeChange: (mode: ApplicationAuthMode) => void;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function validateEmail(value: string): boolean {
  return /\S+@\S+\.\S+/.test(value);
}

export function ApplicationForgotPasswordForm({
  onModeChange
}: ApplicationForgotPasswordFormProps): JSX.Element {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }

    if (!validateEmail(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    setError(undefined);
    setIsSubmitting(true);
    await wait(550);
    setIsSubmitting(false);
    setIsSent(true);
  };

  if (isSent) {
    return (
      <div aria-live="polite" className="auth-card auth-card--success">
        <div className="auth-card__header">
          <h2>Check your inbox</h2>
          <p>If an account exists for that email, we’ve sent a reset link.</p>
        </div>

        <button
          className="button button--job-primary auth-form__submit"
          onClick={() => {
            onModeChange("signin");
          }}
          type="button"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-card__header">
        <h2>Reset your password</h2>
        <p>
          Enter the email address linked to your account and we’ll send you a reset
          link.
        </p>
      </div>

      <form className="auth-form" noValidate onSubmit={handleSubmit}>
        <AuthTextField
          autoComplete="email"
          autoFocus
          error={error}
          label="Email address"
          name="email"
          onChange={(value) => {
            setEmail(value);
            setError(undefined);
          }}
          type="email"
          value={email}
        />

        <button className="button button--job-primary auth-form__submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Sending reset link…" : "Send reset link"}
        </button>
      </form>

      <p className="auth-card__footer">
        <button
          className="auth-mode-link"
          onClick={() => {
            onModeChange("signin");
          }}
          type="button"
        >
          Back to sign in
        </button>
      </p>
    </div>
  );
}
