import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MutableRefObject
} from "react";
import {
  buildApplicationLocationValue,
  findLocationCityInCountry,
  getLocationCityById,
  getLocationCountryByCode,
  getTopCitiesForCountry,
  isLocationValueValidForCountry,
  searchCitiesInCountry,
  searchLocationCountries,
  type ApplicationLocationValue,
  type LocationCityOption,
  type LocationCountryOption
} from "../lib/location-data";
import {
  detectPreferredLocationCountry,
  readBrowserLocationDetectionContext,
  type DetectedLocationCountry,
  type LocationDetectionContext
} from "../lib/location-detection";

export interface ApplicationLocationFieldProps {
  activeCountryCode?: string | null;
  cityNameName?: string;
  cityPlaceholder?: string;
  countryCodeName?: string;
  countrySearchPlaceholder?: string;
  defaultCountryCode?: string | null;
  detectionContext?: LocationDetectionContext;
  disabled?: boolean;
  error?: string;
  hint?: string;
  inputRef?: MutableRefObject<HTMLInputElement | null> | null;
  label?: string;
  name?: string;
  onActiveCountryChange?: (country: LocationCountryOption) => void;
  onChange: (value: ApplicationLocationValue | null) => void;
  required?: boolean;
  stateCodeName?: string;
  value: ApplicationLocationValue | null;
}

function formatCommittedCityLabel(value: ApplicationLocationValue | null): string {
  if (!value?.cityName) {
    return "";
  }

  return value.stateName ? `${value.cityName}, ${value.stateName}` : value.cityName;
}

function normalizeComparisonValue(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
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

function focusNextTick(ref: MutableRefObject<HTMLElement | null>): void {
  window.setTimeout(() => {
    ref.current?.focus();
  }, 0);
}

function resolveInitialCountry(
  value: ApplicationLocationValue | null,
  activeCountryCode: string | null | undefined,
  defaultCountryCode: string | null | undefined,
  detectionContext: LocationDetectionContext | undefined
): DetectedLocationCountry {
  if (value?.countryCode) {
    const country = getLocationCountryByCode(value.countryCode);

    if (country) {
      return {
        country,
        matchedValue: value.countryCode,
        source: "value"
      };
    }
  }

  if (activeCountryCode) {
    const country = getLocationCountryByCode(activeCountryCode);

    if (country) {
      return {
        country,
        matchedValue: activeCountryCode,
        source: "value"
      };
    }
  }

  return detectPreferredLocationCountry({
    ...readBrowserLocationDetectionContext(),
    ...detectionContext,
    fallbackCountryCode: defaultCountryCode ?? detectionContext?.fallbackCountryCode ?? undefined
  });
}

export function ApplicationLocationField({
  activeCountryCode,
  cityNameName,
  cityPlaceholder = "Search for your city",
  countryCodeName,
  countrySearchPlaceholder = "Search countries",
  defaultCountryCode,
  detectionContext,
  disabled = false,
  error,
  hint,
  inputRef = null,
  label = "Location",
  name,
  onActiveCountryChange,
  onChange,
  required = false,
  stateCodeName,
  value
}: ApplicationLocationFieldProps): JSX.Element {
  const fieldId = useId();
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const cityListboxId = `${fieldId}-city-results`;
  const countrySearchId = `${fieldId}-country-search`;
  const countryListboxId = `${fieldId}-country-results`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cityInputRef = useRef<HTMLInputElement | null>(null);
  const countrySearchRef = useRef<HTMLInputElement | null>(null);
  const initialCountry = useMemo(
    () => resolveInitialCountry(value, activeCountryCode, defaultCountryCode, detectionContext),
    // The initial country is allowed to change only when the upstream inputs change.
    [activeCountryCode, defaultCountryCode, detectionContext, value]
  );
  const [uncontrolledCountryCode, setUncontrolledCountryCode] = useState(
    initialCountry.country.isoCode
  );
  const [hasUserSetCountry, setHasUserSetCountry] = useState(false);
  const [cityQuery, setCityQuery] = useState(formatCommittedCityLabel(value));
  const [countryQuery, setCountryQuery] = useState("");
  const [isCityPanelOpen, setIsCityPanelOpen] = useState(false);
  const [isCountryPanelOpen, setIsCountryPanelOpen] = useState(false);
  const [activeCityIndex, setActiveCityIndex] = useState(-1);
  const [activeCountryIndex, setActiveCountryIndex] = useState(-1);
  const resolvedCountryCode =
    activeCountryCode?.trim().toUpperCase() || uncontrolledCountryCode || initialCountry.country.isoCode;
  const activeCountry =
    getLocationCountryByCode(resolvedCountryCode) ?? initialCountry.country;
  const selectedCity =
    value && isLocationValueValidForCountry(value, activeCountry.isoCode)
      ? getLocationCityById(activeCountry.isoCode, value.cityId) ??
        findLocationCityInCountry(activeCountry.isoCode, value.cityName, value.stateCode)
      : null;
  const cityResults = useMemo(
    () =>
      cityQuery.trim()
        ? searchCitiesInCountry(activeCountry.isoCode, cityQuery, 10)
        : getTopCitiesForCountry(activeCountry.isoCode, 8),
    [activeCountry.isoCode, cityQuery]
  );
  const countryResults = useMemo(
    () => searchLocationCountries(countryQuery, countryQuery.trim() ? 12 : 10),
    [countryQuery]
  );
  const cityPanelState = cityQuery.trim()
    ? cityResults.length > 0
      ? "results"
      : "empty"
    : cityResults.length > 0
      ? "featured"
      : "empty";

  useEffect(() => {
    if (activeCountryCode) {
      return;
    }

    if (value?.countryCode && value.countryCode !== uncontrolledCountryCode) {
      setUncontrolledCountryCode(value.countryCode);
      return;
    }

    if (!hasUserSetCountry && !value?.countryCode && initialCountry.country.isoCode !== uncontrolledCountryCode) {
      setUncontrolledCountryCode(initialCountry.country.isoCode);
    }
  }, [
    activeCountryCode,
    hasUserSetCountry,
    initialCountry.country.isoCode,
    uncontrolledCountryCode,
    value?.countryCode
  ]);

  useEffect(() => {
    if (!isCityPanelOpen) {
      setCityQuery(selectedCity?.displayLabel ?? formatCommittedCityLabel(value));
    }
  }, [isCityPanelOpen, selectedCity, value]);

  useEffect(() => {
    if (!value) {
      return;
    }

    if (isLocationValueValidForCountry(value, activeCountry.isoCode)) {
      return;
    }

    onChange(null);
    setCityQuery("");
  }, [activeCountry.isoCode, onChange, value]);

  useEffect(() => {
    setActiveCityIndex(cityResults.length > 0 ? 0 : -1);
  }, [cityResults]);

  useEffect(() => {
    setActiveCountryIndex(countryResults.length > 0 ? 0 : -1);
  }, [countryResults]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent): void {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (rootRef.current?.contains(target)) {
        return;
      }

      clearCommittedLocationIfQueryChanged();
      setIsCityPanelOpen(false);
      setIsCountryPanelOpen(false);
      setCountryQuery("");
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [cityQuery, onChange, selectedCity, value]);

  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  const activeCityDescendantId =
    activeCityIndex >= 0 && cityResults[activeCityIndex]
      ? `${fieldId}-city-option-${cityResults[activeCityIndex].id}`
      : undefined;
  const activeCountryDescendantId =
    activeCountryIndex >= 0 && countryResults[activeCountryIndex]
      ? `${fieldId}-country-option-${countryResults[activeCountryIndex].isoCode}`
      : undefined;

  function clearCommittedLocationIfQueryChanged(): void {
    if (!value) {
      return;
    }

    const committedCityLabel = selectedCity?.displayLabel ?? formatCommittedCityLabel(value);

    if (
      normalizeComparisonValue(committedCityLabel) ===
      normalizeComparisonValue(cityQuery)
    ) {
      return;
    }

    onChange(null);
  }

  function commitCountry(nextCountry: LocationCountryOption): void {
    if (!activeCountryCode) {
      setUncontrolledCountryCode(nextCountry.isoCode);
    }

    setHasUserSetCountry(true);
    setCountryQuery("");
    setIsCountryPanelOpen(false);
    setIsCityPanelOpen(true);
    onActiveCountryChange?.(nextCountry);

    if (!isLocationValueValidForCountry(value, nextCountry.isoCode)) {
      onChange(null);
      setCityQuery("");
    } else if (selectedCity) {
      setCityQuery(selectedCity.displayLabel);
    }

    focusNextTick(cityInputRef as MutableRefObject<HTMLElement | null>);
  }

  function commitCity(nextCity: LocationCityOption): void {
    setCityQuery(nextCity.displayLabel);
    setIsCityPanelOpen(false);
    setIsCountryPanelOpen(false);
    setCountryQuery("");

    if (!activeCountryCode && nextCity.countryCode !== uncontrolledCountryCode) {
      setUncontrolledCountryCode(nextCity.countryCode);
    }

    if (nextCity.countryCode !== activeCountry.isoCode) {
      const nextCountry = getLocationCountryByCode(nextCity.countryCode);

      if (nextCountry) {
        onActiveCountryChange?.(nextCountry);
      }
    }

    onChange(buildApplicationLocationValue(nextCity));
  }

  function handleCityKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (disabled) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsCityPanelOpen(true);
      setActiveCityIndex((currentIndex) => clampIndex(currentIndex + 1, cityResults.length));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsCityPanelOpen(true);
      setActiveCityIndex((currentIndex) => clampIndex(currentIndex - 1, cityResults.length));
      return;
    }

    if (event.key === "Enter" && isCityPanelOpen && activeCityIndex >= 0 && cityResults[activeCityIndex]) {
      event.preventDefault();
      commitCity(cityResults[activeCityIndex]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsCityPanelOpen(false);
      setCityQuery(selectedCity?.displayLabel ?? formatCommittedCityLabel(value));
    }
  }

  function handleCountryKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveCountryIndex((currentIndex) => clampIndex(currentIndex + 1, countryResults.length));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveCountryIndex((currentIndex) => clampIndex(currentIndex - 1, countryResults.length));
      return;
    }

    if (event.key === "Enter" && activeCountryIndex >= 0 && countryResults[activeCountryIndex]) {
      event.preventDefault();
      commitCountry(countryResults[activeCountryIndex]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsCountryPanelOpen(false);
      setCountryQuery("");
      focusNextTick(cityInputRef as MutableRefObject<HTMLElement | null>);
    }
  }

  return (
    <div
      className="auth-field application-location-field"
      data-city-panel-open={isCityPanelOpen ? "true" : "false"}
      data-country-code={activeCountry.isoCode}
      data-country-panel-open={isCountryPanelOpen ? "true" : "false"}
      data-country-source={activeCountryCode || value?.countryCode ? "value" : initialCountry.source}
      data-has-selection={value ? "true" : "false"}
      data-search-state={cityPanelState}
      ref={rootRef}
    >
      <div className="application-location-field__label-row">
        <label className="auth-field__label" htmlFor={fieldId}>
          {label}
        </label>
        {hint ? (
          <span className="application-location-field__hint" id={hintId}>
            {hint}
          </span>
        ) : null}
      </div>

      <div
        className="application-location-field__control"
        data-error-state={error ? "true" : "false"}
        data-picker-open={isCountryPanelOpen ? "country" : isCityPanelOpen ? "city" : "closed"}
      >
        <input
          aria-activedescendant={isCityPanelOpen ? activeCityDescendantId : undefined}
          aria-autocomplete="list"
          aria-controls={isCityPanelOpen ? cityListboxId : undefined}
          aria-describedby={describedBy}
          aria-expanded={isCityPanelOpen}
          aria-invalid={Boolean(error)}
          autoComplete="off"
          className={["auth-field__input", "application-location-field__input", error ? "auth-field__input--error" : ""]
            .filter(Boolean)
            .join(" ")}
          disabled={disabled}
          id={fieldId}
          name={`${fieldId}-query`}
          onChange={(event) => {
            setCityQuery(event.target.value);
            setIsCityPanelOpen(true);
            setIsCountryPanelOpen(false);
          }}
          onBlur={(event) => {
            const nextFocusedTarget = event.relatedTarget;

            if (nextFocusedTarget instanceof Node && rootRef.current?.contains(nextFocusedTarget)) {
              return;
            }

            clearCommittedLocationIfQueryChanged();
            setIsCityPanelOpen(false);
          }}
          onFocus={() => {
            setIsCityPanelOpen(true);
            setIsCountryPanelOpen(false);
          }}
          onKeyDown={handleCityKeyDown}
          placeholder={cityPlaceholder}
          ref={(node) => {
            cityInputRef.current = node;

            if (inputRef) {
              inputRef.current = node;
            }
          }}
          required={required}
          role="combobox"
          type="text"
          value={cityQuery}
        />

        <button
          aria-label={`Change country, currently ${activeCountry.name}`}
          aria-controls={isCountryPanelOpen ? countryListboxId : undefined}
          aria-expanded={isCountryPanelOpen}
          aria-haspopup="dialog"
          className="application-location-field__country-trigger"
          data-country-code={activeCountry.isoCode}
          disabled={disabled}
          onClick={() => {
            const nextOpenState = !isCountryPanelOpen;
            setIsCountryPanelOpen(nextOpenState);
            setIsCityPanelOpen(false);

            if (nextOpenState) {
              focusNextTick(countrySearchRef as MutableRefObject<HTMLElement | null>);
            } else {
              setCountryQuery("");
              focusNextTick(cityInputRef as MutableRefObject<HTMLElement | null>);
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

        {name ? <input name={name} type="hidden" value={value?.label ?? ""} /> : null}
        {countryCodeName ? (
          <input name={countryCodeName} type="hidden" value={activeCountry.isoCode} />
        ) : null}
        {cityNameName ? <input name={cityNameName} type="hidden" value={value?.cityName ?? ""} /> : null}
        {stateCodeName ? (
          <input name={stateCodeName} type="hidden" value={value?.stateCode ?? ""} />
        ) : null}

        {isCityPanelOpen ? (
          <div
            className="application-location-field__panel application-location-field__panel--cities"
            data-panel-state={cityPanelState}
          >
            {cityResults.length > 0 ? (
              <ul
                className="application-location-field__results"
                id={cityListboxId}
                role="listbox"
              >
                {cityResults.map((city, index) => (
                  <li
                    aria-selected={index === activeCityIndex}
                    className="application-location-field__result"
                    data-active={index === activeCityIndex ? "true" : "false"}
                    data-result-kind={cityQuery.trim() ? "match" : "featured"}
                    id={`${fieldId}-city-option-${city.id}`}
                    key={city.id}
                    onClick={() => {
                      commitCity(city);
                    }}
                    onMouseDown={(event) => {
                      event.preventDefault();
                    }}
                    onMouseEnter={() => {
                      setActiveCityIndex(index);
                    }}
                    role="option"
                    tabIndex={-1}
                  >
                    <div className="application-location-field__result-copy">
                      <strong>{city.displayLabel}</strong>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="application-location-field__empty-state">
                <strong>No city matches found</strong>
                <span>Try a different spelling or switch countries using the flag.</span>
              </div>
            )}
          </div>
        ) : null}

        {isCountryPanelOpen ? (
          <div
            aria-label="Choose country"
            className="application-location-field__panel application-location-field__panel--countries"
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
              placeholder={countrySearchPlaceholder}
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
                      <strong>{country.name}</strong>
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

export type { ApplicationLocationValue };
