import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent
} from "react";
import {
  getCountryCallingCode,
  isSupportedCountry,
  isValidPhoneNumber,
  parseDigits,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
  type CountryCode
} from "libphonenumber-js";
import type { CandidatePhoneNumberValue } from "../contracts/application";
import {
  getDefaultLocationCountryCode,
  getLocationCountryByCode,
  searchLocationCountries,
  type LocationCountryOption
} from "../lib/location-data";

export interface ApplicationPhoneFieldProps {
  defaultCountryCode?: string | null;
  error?: string;
  label?: string;
  name?: string;
  onChange: (value: CandidatePhoneNumberValue) => void;
  value: CandidatePhoneNumberValue | string;
}

function toCountryCode(countryCode: string): CountryCode | null {
  const normalizedCountryCode = countryCode.trim().toUpperCase();
  return isSupportedCountry(normalizedCountryCode) ? (normalizedCountryCode as CountryCode) : null;
}

function getSupportedLocationCountry(countryCode: string | null | undefined): LocationCountryOption {
  const fallbackCountry =
    getLocationCountryByCode(getDefaultLocationCountryCode()) ??
    searchLocationCountries("", 1)[0];
  const requestedCountry = getLocationCountryByCode(countryCode);
  const supportedCountry = requestedCountry?.isoCode
    ? toCountryCode(requestedCountry.isoCode)
      ? requestedCountry
      : null
    : null;

  if (supportedCountry) {
    return supportedCountry;
  }

  return fallbackCountry;
}

function getCallingCode(countryCode: string): string {
  const supportedCountryCode = toCountryCode(countryCode);
  return supportedCountryCode ? getCountryCallingCode(supportedCountryCode) : "";
}

function getPhoneRawValue(value: CandidatePhoneNumberValue | string): string {
  return typeof value === "string" ? value : value.raw;
}

function getPhoneCountryCode(
  value: CandidatePhoneNumberValue | string,
  defaultCountryCode: string | null | undefined
): string {
  if (typeof value !== "string" && value.countryCode) {
    return value.countryCode;
  }

  return defaultCountryCode ?? getDefaultLocationCountryCode();
}

function sanitizeNationalNumber(value: string): string {
  return parseDigits(value).replace(/^0+/, "");
}

function trimNationalNumberToCountryMax(value: string, countryCode: string): string {
  const supportedCountryCode = toCountryCode(countryCode);
  let nextValue = sanitizeNationalNumber(value);

  if (!supportedCountryCode) {
    return nextValue.slice(0, 15);
  }

  while (
    nextValue.length > 0 &&
    validatePhoneNumberLength(nextValue, supportedCountryCode) === "TOO_LONG"
  ) {
    nextValue = nextValue.slice(0, -1);
  }

  return nextValue;
}

export function buildCandidatePhoneNumberValue(
  rawValue: string,
  country: LocationCountryOption
): CandidatePhoneNumberValue {
  const countryCode = toCountryCode(country.isoCode);
  const raw = trimNationalNumberToCountryMax(rawValue, country.isoCode);
  const parsedPhoneNumber = countryCode
    ? parsePhoneNumberFromString(raw, countryCode)
    : undefined;

  return {
    countryCode: country.isoCode,
    countryFlag: country.flag,
    countryName: country.name,
    e164: parsedPhoneNumber?.number ?? null,
    phoneCode: getCallingCode(country.isoCode),
    raw
  };
}

export function getCandidatePhoneNumberError(
  value: CandidatePhoneNumberValue | string,
  fallbackCountryCode?: string | null
): string | undefined {
  const country = getSupportedLocationCountry(getPhoneCountryCode(value, fallbackCountryCode));
  const countryCode = toCountryCode(country.isoCode);
  const raw = sanitizeNationalNumber(getPhoneRawValue(value));

  if (!raw) {
    return undefined;
  }

  if (!countryCode) {
    return "Choose a supported phone country.";
  }

  const lengthIssue = validatePhoneNumberLength(raw, countryCode);

  if (lengthIssue === "TOO_SHORT") {
    return `Enter a longer phone number for ${country.name}.`;
  }

  if (lengthIssue === "TOO_LONG") {
    return `Enter a shorter phone number for ${country.name}.`;
  }

  if (lengthIssue) {
    return `Enter a valid phone number for ${country.name}.`;
  }

  return isValidPhoneNumber(raw, countryCode)
    ? undefined
    : `Enter a valid phone number for ${country.name}.`;
}

function clampIndex(nextIndex: number, itemCount: number): number {
  if (itemCount <= 0) {
    return -1;
  }

  if (nextIndex < 0) {
    return itemCount - 1;
  }

  if (nextIndex >= itemCount) {
    return 0;
  }

  return nextIndex;
}

function getSupportedCountryResults(query: string): readonly LocationCountryOption[] {
  return searchLocationCountries(query, query.trim() ? 18 : 14)
    .filter((country) => Boolean(toCountryCode(country.isoCode)))
    .slice(0, query.trim() ? 12 : 10);
}

export function ApplicationPhoneField({
  defaultCountryCode,
  error,
  label = "Phone Number (Optional)",
  name,
  onChange,
  value
}: ApplicationPhoneFieldProps): JSX.Element {
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const countrySearchId = `${fieldId}-country-search`;
  const countryListboxId = `${fieldId}-country-results`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const countrySearchRef = useRef<HTMLInputElement | null>(null);
  const [countryQuery, setCountryQuery] = useState("");
  const [isCountryPanelOpen, setIsCountryPanelOpen] = useState(false);
  const [activeCountryIndex, setActiveCountryIndex] = useState(-1);
  const activeCountry = getSupportedLocationCountry(
    getPhoneCountryCode(value, defaultCountryCode)
  );
  const rawValue = trimNationalNumberToCountryMax(getPhoneRawValue(value), activeCountry.isoCode);
  const countryResults = useMemo(
    () => getSupportedCountryResults(countryQuery),
    [countryQuery]
  );
  const activeCountryDescendantId =
    isCountryPanelOpen && activeCountryIndex >= 0 && countryResults[activeCountryIndex]
      ? `${fieldId}-country-option-${countryResults[activeCountryIndex].isoCode}`
      : undefined;

  useEffect(() => {
    if (typeof value === "string" && defaultCountryCode) {
      const defaultCountry = getSupportedLocationCountry(defaultCountryCode);
      onChange(buildCandidatePhoneNumberValue(value, defaultCountry));
    }
  }, [defaultCountryCode, onChange, value]);

  function focusPhoneInput(): void {
    window.setTimeout(() => {
      phoneInputRef.current?.focus();
    }, 0);
  }

  function focusCountrySearch(): void {
    window.setTimeout(() => {
      countrySearchRef.current?.focus();
    }, 0);
  }

  function commitCountry(country: LocationCountryOption): void {
    onChange(buildCandidatePhoneNumberValue(rawValue, country));
    setIsCountryPanelOpen(false);
    setCountryQuery("");
    focusPhoneInput();
  }

  function handleCountryKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveCountryIndex((current) => clampIndex(current + 1, countryResults.length));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveCountryIndex((current) => clampIndex(current - 1, countryResults.length));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const selectedCountry = countryResults[activeCountryIndex] ?? countryResults[0];

      if (selectedCountry) {
        commitCountry(selectedCountry);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsCountryPanelOpen(false);
      setCountryQuery("");
      focusPhoneInput();
    }
  }

  return (
    <div
      className="auth-field application-phone-field"
      data-country-code={activeCountry.isoCode}
      data-country-panel-open={isCountryPanelOpen ? "true" : "false"}
      ref={rootRef}
    >
      <div className="application-location-field__label-row">
        <label className="auth-field__label" htmlFor={fieldId}>
          {label}
        </label>
      </div>

      <div
        className="application-phone-field__control"
        data-error-state={error ? "true" : "false"}
        data-picker-open={isCountryPanelOpen ? "country" : "closed"}
      >
        <span className="application-phone-field__prefix">+{getCallingCode(activeCountry.isoCode)}</span>
        <input
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          autoComplete="tel-national"
          className={[
            "auth-field__input",
            "application-phone-field__input",
            error ? "auth-field__input--error" : ""
          ]
            .filter(Boolean)
            .join(" ")}
          id={fieldId}
          inputMode="tel"
          name={name}
          onChange={(event) => {
            onChange(buildCandidatePhoneNumberValue(event.target.value, activeCountry));
          }}
          placeholder=""
          ref={phoneInputRef}
          type="tel"
          value={rawValue}
        />

        <button
          aria-label={`Change phone country, currently ${activeCountry.name}`}
          aria-controls={isCountryPanelOpen ? countryListboxId : undefined}
          aria-expanded={isCountryPanelOpen}
          aria-haspopup="dialog"
          className="application-location-field__country-trigger application-phone-field__country-trigger"
          data-country-code={activeCountry.isoCode}
          onClick={() => {
            const nextOpenState = !isCountryPanelOpen;
            setIsCountryPanelOpen(nextOpenState);

            if (nextOpenState) {
              focusCountrySearch();
            } else {
              setCountryQuery("");
              focusPhoneInput();
            }
          }}
          type="button"
        >
          <span
            aria-hidden="true"
            className="application-location-field__country-flag"
            data-country-code={activeCountry.isoCode}
          >
            {activeCountry.flag}
          </span>
        </button>

        {isCountryPanelOpen ? (
          <div
            aria-label="Choose phone country"
            className="application-location-field__panel application-phone-field__panel"
            data-panel-state={countryResults.length > 0 ? "results" : "empty"}
            role="dialog"
          >
            <input
              aria-activedescendant={activeCountryDescendantId}
              aria-controls={countryListboxId}
              aria-expanded={isCountryPanelOpen}
              autoComplete="off"
              className="auth-field__input application-location-field__country-search"
              id={countrySearchId}
              onChange={(event) => {
                setCountryQuery(event.target.value);
                setActiveCountryIndex(-1);
              }}
              onBlur={(event) => {
                const nextFocusedTarget = event.relatedTarget;

                if (nextFocusedTarget instanceof Node && rootRef.current?.contains(nextFocusedTarget)) {
                  return;
                }

                setIsCountryPanelOpen(false);
                setCountryQuery("");
              }}
              onKeyDown={handleCountryKeyDown}
              placeholder="Search countries"
              ref={countrySearchRef}
              role="combobox"
              type="text"
              value={countryQuery}
            />

            {countryResults.length > 0 ? (
              <ul
                className="application-location-field__results application-location-field__results--countries"
                id={countryListboxId}
                role="listbox"
              >
                {countryResults.map((country, index) => (
                  <li
                    aria-selected={country.isoCode === activeCountry.isoCode}
                    className="application-location-field__result application-location-field__result--country"
                    data-active={index === activeCountryIndex ? "true" : "false"}
                    data-selected={country.isoCode === activeCountry.isoCode ? "true" : "false"}
                    id={`${fieldId}-country-option-${country.isoCode}`}
                    key={country.isoCode}
                    onClick={() => {
                      commitCountry(country);
                    }}
                    onMouseDown={(event) => {
                      event.preventDefault();
                    }}
                    onMouseEnter={() => {
                      setActiveCountryIndex(index);
                    }}
                    role="option"
                    tabIndex={-1}
                  >
                    <div className="application-location-field__result-copy">
                      <strong>{country.name} (+{getCallingCode(country.isoCode)})</strong>
                    </div>
                    <span aria-hidden="true" className="application-location-field__result-flag">
                      {country.flag}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="application-location-field__empty-state">
                <strong>No country matches found</strong>
                <span>Try a different country name or ISO code.</span>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="auth-field__error" id={errorId} role="status">
          {error}
        </p>
      ) : null}
    </div>
  );
}
