import { useState, type FormEvent } from "react";
import type { ApplicationAuthMode, AuthProvider } from "../contracts/application";
import type { JobViewData } from "../contracts/job-view";
import {
  AuthDivider,
  AuthPasswordField,
  AuthTextField,
  SocialAuthButtons
} from "./ApplicationAuthPrimitives";

interface ApplicationSignUpFormProps {
  job: JobViewData;
  onAuthSuccess: (input: {
    email: string;
    firstName?: string;
    lastName?: string;
    entryMode: "signup";
    provider: AuthProvider;
  }) => Promise<void>;
  onModeChange: (mode: ApplicationAuthMode) => void;
}

interface SignUpErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function validateEmail(value: string): boolean {
  return /\S+@\S+\.\S+/.test(value);
}

export function ApplicationSignUpForm({
  job,
  onAuthSuccess,
  onModeChange
}: ApplicationSignUpFormProps): JSX.Element {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<SignUpErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<AuthProvider | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const nextErrors: SignUpErrors = {};

    if (!firstName.trim()) {
      nextErrors.firstName = "Enter your first name.";
    }

    if (!lastName.trim()) {
      nextErrors.lastName = "Enter your last name.";
    }

    if (!email.trim()) {
      nextErrors.email = "Enter your email address.";
    } else if (!validateEmail(email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password.trim()) {
      nextErrors.password = "Enter your password.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    await wait(600);
    await onAuthSuccess({
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      entryMode: "signup",
      provider: "email"
    });
    setIsSubmitting(false);
  };

  const handleSocial = async (provider: Exclude<AuthProvider, "email">): Promise<void> => {
    setSocialLoading(provider);
    await wait(450);
    await onAuthSuccess({
      email: email.trim() || `candidate@${provider}.prototype`,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      entryMode: "signup",
      provider
    });
    setSocialLoading(null);
  };

  return (
    <div className="auth-card">
      <div className="auth-card__header">
        <h2>Create your account</h2>
        <p>
          Create an account to continue your application to {job.title} at {job.companyName}.
        </p>
      </div>

      <SocialAuthButtons
        actionLabel="Sign up"
        disabled={isSubmitting || socialLoading !== null}
        loadingProvider={socialLoading}
        onSelect={handleSocial}
      />

      <AuthDivider label="or continue with email" />

      <form className="auth-form" noValidate onSubmit={handleSubmit}>
        <div className="auth-form__grid">
          <AuthTextField
            autoComplete="given-name"
            autoFocus
            error={errors.firstName}
            label="First name"
            name="firstName"
            onChange={(value) => {
              setFirstName(value);
              setErrors((current) => ({ ...current, firstName: undefined }));
            }}
            value={firstName}
          />

          <AuthTextField
            autoComplete="family-name"
            error={errors.lastName}
            label="Last name"
            name="lastName"
            onChange={(value) => {
              setLastName(value);
              setErrors((current) => ({ ...current, lastName: undefined }));
            }}
            value={lastName}
          />
        </div>

        <AuthTextField
          autoComplete="email"
          error={errors.email}
          label="Email address"
          name="email"
          onChange={(value) => {
            setEmail(value);
            setErrors((current) => ({ ...current, email: undefined }));
          }}
          type="email"
          value={email}
        />

        <AuthPasswordField
          autoComplete="new-password"
          error={errors.password}
          label="Password"
          name="password"
          onChange={(value) => {
            setPassword(value);
            setErrors((current) => ({ ...current, password: undefined }));
          }}
          value={password}
        />

        <p className="auth-form__legal">
          By proceeding, you accept our{" "}
          <a href="https://www.ditto.jobs/legal/terms">Terms of Service</a>.
        </p>

        <button className="button button--job-primary auth-form__submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="auth-card__footer">
        Already have an account?{" "}
        <button
          className="auth-mode-link"
          onClick={() => {
            onModeChange("signin");
          }}
          type="button"
        >
          Sign in
        </button>
      </p>
    </div>
  );
}
