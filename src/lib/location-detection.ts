import {
  buildApplicationLocationValue,
  findLocationCityInCountry,
  findLocationCountryByQuery,
  findLocationCountryFromLocationHint,
  getAllLocationCountries,
  getDefaultLocationCountryCode,
  getLocationCountryByCode,
  type ApplicationLocationValue,
  type LocationCountryOption
} from "./location-data";

export type LocationDetectionSource =
  | "value"
  | "parsed-cv"
  | "user-country"
  | "user-locale"
  | "browser-locale"
  | "browser-timezone"
  | "fallback";

export interface BrowserLocationDetectionContext {
  browserLocales?: readonly string[] | null;
  browserTimeZone?: string | null;
}

export interface LocationDetectionContext extends BrowserLocationDetectionContext {
  appLocale?: string | null;
  fallbackCountryCode?: string | null;
  parsedCvLocationHint?: string | null;
  userCountryCode?: string | null;
  userLocale?: string | null;
}

export interface DetectedLocationCountry {
  country: LocationCountryOption;
  source: LocationDetectionSource;
  matchedValue?: string;
}

export type PrototypeCountryDetectionSource =
  | "parsed-signal"
  | "saved-draft"
  | "browser-locale"
  | "browser-timezone"
  | "fallback";

export interface DetectedPrototypeLocation {
  detectedCountry: {
    country: {
      code: string;
      flag: string;
      name: string;
    };
    matchedValue?: string;
    source: PrototypeCountryDetectionSource;
  };
  location: ApplicationLocationValue | null;
}

interface ParsingSignalLike {
  label: string;
  tone?: string | null;
}

interface ExistingLocationLike {
  cityId?: string | null;
  cityName?: string | null;
  countryCode?: string | null;
  countryName?: string | null;
  label?: string | null;
  stateCode?: string | null;
  stateName?: string | null;
}

const timezoneToCountries = new Map<string, LocationCountryOption[]>();

function normalizeCountryCode(countryCode: string | null | undefined): string | null {
  const normalizedCountryCode = countryCode?.trim().toUpperCase();
  return normalizedCountryCode ? normalizedCountryCode : null;
}

function extractRegionFromLocale(locale: string | null | undefined): string | null {
  if (!locale) {
    return null;
  }

  const normalizedLocale = locale.replace(/_/g, "-").trim();
  const localeParts = normalizedLocale.split("-");

  for (let index = 1; index < localeParts.length; index += 1) {
    const part = localeParts[index]?.trim();

    if (!part) {
      continue;
    }

    if (/^[A-Za-z]{2}$/.test(part)) {
      return part.toUpperCase();
    }
  }

  return null;
}

function buildTimeZoneLookup(): void {
  if (timezoneToCountries.size > 0) {
    return;
  }

  getAllLocationCountries().forEach((country) => {
    country.timeZoneNames.forEach((timeZoneName) => {
      const matchedCountries = timezoneToCountries.get(timeZoneName) ?? [];
      matchedCountries.push(country);
      timezoneToCountries.set(timeZoneName, matchedCountries);
    });
  });
}

function detectFromLocale(
  locale: string | null | undefined,
  source: Extract<LocationDetectionSource, "user-locale" | "browser-locale">
): DetectedLocationCountry | null {
  const regionCode = extractRegionFromLocale(locale);
  const country = getLocationCountryByCode(regionCode);

  if (!country) {
    return null;
  }

  return {
    country,
    matchedValue: locale ?? undefined,
    source
  };
}

function detectFromTimeZone(timeZone: string | null | undefined): DetectedLocationCountry | null {
  if (!timeZone) {
    return null;
  }

  buildTimeZoneLookup();
  const matchedCountries = timezoneToCountries.get(timeZone) ?? [];

  if (matchedCountries.length === 1) {
    return {
      country: matchedCountries[0],
      matchedValue: timeZone,
      source: "browser-timezone"
    };
  }

  if (matchedCountries.length > 1) {
    const normalizedZone = timeZone.split("/").pop()?.replace(/_/g, " ");
    const directCountryMatch = findLocationCountryByQuery(normalizedZone);

    if (directCountryMatch) {
      return {
        country: directCountryMatch,
        matchedValue: timeZone,
        source: "browser-timezone"
      };
    }
  }

  return null;
}

export function readBrowserLocationDetectionContext(): BrowserLocationDetectionContext {
  if (typeof window === "undefined") {
    return {};
  }

  return {
    browserLocales:
      navigator.languages && navigator.languages.length > 0
        ? navigator.languages
        : navigator.language
          ? [navigator.language]
          : [],
    browserTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null
  };
}

export function detectPreferredLocationCountry(
  context: LocationDetectionContext = {}
): DetectedLocationCountry {
  const parsedCountry = findLocationCountryFromLocationHint(context.parsedCvLocationHint);

  if (parsedCountry) {
    return {
      country: parsedCountry,
      matchedValue: context.parsedCvLocationHint ?? undefined,
      source: "parsed-cv"
    };
  }

  const userCountry = getLocationCountryByCode(normalizeCountryCode(context.userCountryCode));

  if (userCountry) {
    return {
      country: userCountry,
      matchedValue: context.userCountryCode ?? undefined,
      source: "user-country"
    };
  }

  const userLocaleMatch =
    detectFromLocale(context.userLocale, "user-locale") ??
    detectFromLocale(context.appLocale, "user-locale");

  if (userLocaleMatch) {
    return userLocaleMatch;
  }

  for (const locale of context.browserLocales ?? []) {
    const browserLocaleMatch = detectFromLocale(locale, "browser-locale");

    if (browserLocaleMatch) {
      return browserLocaleMatch;
    }
  }

  const browserTimeZoneMatch = detectFromTimeZone(context.browserTimeZone);

  if (browserTimeZoneMatch) {
    return browserTimeZoneMatch;
  }

  const fallbackCountryCode =
    normalizeCountryCode(context.fallbackCountryCode) ?? getDefaultLocationCountryCode();
  const fallbackCountry =
    getLocationCountryByCode(fallbackCountryCode) ??
    getLocationCountryByCode(getDefaultLocationCountryCode());

  if (!fallbackCountry) {
    throw new Error("No fallback location country could be resolved.");
  }

  return {
    country: fallbackCountry,
    matchedValue: fallbackCountry.isoCode,
    source: "fallback"
  };
}

function mapToPrototypeCountrySource(
  source: LocationDetectionSource
): PrototypeCountryDetectionSource {
  if (source === "parsed-cv") {
    return "parsed-signal";
  }

  if (source === "browser-timezone") {
    return "browser-timezone";
  }

  if (source === "fallback") {
    return "fallback";
  }

  return "browser-locale";
}

function findParsedLocationHint(extractedSignals: readonly ParsingSignalLike[]): string | null {
  const parsedLocationSignal = extractedSignals.find((signal) => signal.tone === "location");
  return parsedLocationSignal?.label?.trim() || null;
}

function buildPrototypeLocationFromHint(
  countryCode: string,
  parsedLocationHint: string | null | undefined
): ApplicationLocationValue | null {
  const normalizedHint = parsedLocationHint?.trim();

  if (!normalizedHint) {
    return null;
  }

  const candidateCityHints = normalizedHint
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  for (const cityHint of candidateCityHints) {
    const matchedCity = findLocationCityInCountry(countryCode, cityHint);

    if (matchedCity) {
      return buildApplicationLocationValue(matchedCity);
    }
  }

  const fallbackCity = findLocationCityInCountry(countryCode, normalizedHint);
  return fallbackCity ? buildApplicationLocationValue(fallbackCity) : null;
}

export function buildDetectedPrototypeLocation(
  extractedSignals: readonly ParsingSignalLike[],
  existingLocation: ExistingLocationLike | null,
  context: LocationDetectionContext = {}
): DetectedPrototypeLocation {
  if (existingLocation?.countryCode) {
    const savedCountry = getLocationCountryByCode(existingLocation.countryCode);

    if (savedCountry) {
      const savedCity =
        existingLocation.cityId
          ? findLocationCityInCountry(
              savedCountry.isoCode,
              existingLocation.cityName,
              existingLocation.stateCode
            )
          : null;

      return {
        detectedCountry: {
          country: {
            code: savedCountry.isoCode,
            flag: savedCountry.flag,
            name: savedCountry.name
          },
          matchedValue: existingLocation.countryCode,
          source: "saved-draft"
        },
        location: savedCity
          ? buildApplicationLocationValue(savedCity)
          : existingLocation.cityId &&
              existingLocation.cityName &&
              existingLocation.countryName &&
              existingLocation.label
            ? {
                cityId: existingLocation.cityId,
                cityName: existingLocation.cityName,
                countryCode: savedCountry.isoCode,
                countryName: existingLocation.countryName,
                label: existingLocation.label,
                stateCode: existingLocation.stateCode ?? undefined,
                stateName: existingLocation.stateName ?? undefined
              }
            : null
      };
    }
  }

  const parsedLocationHint = findParsedLocationHint(extractedSignals);
  const detectedCountry = detectPreferredLocationCountry({
    ...readBrowserLocationDetectionContext(),
    ...context,
    parsedCvLocationHint: parsedLocationHint ?? context.parsedCvLocationHint ?? undefined
  });

  return {
    detectedCountry: {
      country: {
        code: detectedCountry.country.isoCode,
        flag: detectedCountry.country.flag,
        name: detectedCountry.country.name
      },
      matchedValue: detectedCountry.matchedValue,
      source: mapToPrototypeCountrySource(detectedCountry.source)
    },
    location: buildPrototypeLocationFromHint(detectedCountry.country.isoCode, parsedLocationHint)
  };
}
