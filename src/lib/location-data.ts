import { City, Country, State, type ICity, type ICountry } from "country-state-city";

export interface LocationCountryOption {
  isoCode: string;
  latitude: number | null;
  longitude: number | null;
  name: string;
  flag: string;
  phoneCode: string;
  currency: string;
  timeZoneNames: readonly string[];
  searchText: string;
}

export interface LocationCityOption {
  id: string;
  name: string;
  stateCode: string;
  stateName?: string;
  latitude: number | null;
  longitude: number | null;
  countryCode: string;
  countryName: string;
  countryFlag: string;
  countryLatitude: number | null;
  countryLongitude: number | null;
  phoneCode: string;
  displayLabel: string;
  selectionLabel: string;
  searchText: string;
}

export interface ApplicationLocationValue {
  cityId: string;
  cityLatitude?: number | null;
  cityLongitude?: number | null;
  cityName: string;
  countryFlag?: string;
  stateCode?: string;
  stateName?: string;
  countryCode: string;
  countryLatitude?: number | null;
  countryLongitude?: number | null;
  countryName: string;
  phoneCode?: string;
  label: string;
}

const DEFAULT_COUNTRY_CODE = "ZA";

const PRIORITY_COUNTRY_ORDER = [
  "ZA",
  "GB",
  "US",
  "AU",
  "CA",
  "NZ",
  "IE",
  "NL",
  "DE",
  "FR",
  "SG",
  "AE",
  "IN",
  "KE",
  "NG"
] as const;

const COUNTRY_ALIASES: Record<string, readonly string[]> = {
  AE: ["UAE", "United Arab Emirates"],
  CZ: ["Czech Republic", "Czechia"],
  GB: ["Britain", "England", "Great Britain", "U.K.", "UK", "United Kingdom"],
  KR: ["Korea", "South Korea"],
  NL: ["Holland", "The Netherlands", "Netherlands"],
  RU: ["Russia", "Russian Federation"],
  SA: ["KSA", "Saudi Arabia"],
  TR: ["Turkey", "Turkiye", "Türkiye"],
  US: ["America", "U.S.", "U.S.A.", "USA", "United States", "United States of America"],
  VN: ["Viet Nam", "Vietnam"],
  ZA: ["RSA", "South Africa"]
};

const PRIORITY_CITY_NAMES_BY_COUNTRY: Record<string, readonly string[]> = {
  AE: ["Dubai", "Abu Dhabi", "Sharjah"],
  AU: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Canberra"],
  CA: ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa", "Edmonton"],
  DE: ["Berlin", "Munich", "Hamburg", "Cologne", "Frankfurt am Main", "Stuttgart"],
  FR: ["Paris", "Lyon", "Marseille", "Toulouse", "Bordeaux", "Nice"],
  GB: ["London", "Manchester", "Birmingham", "Leeds", "Bristol", "Edinburgh", "Glasgow"],
  IE: ["Dublin", "Cork", "Galway", "Limerick", "Waterford"],
  IN: ["Bengaluru", "Mumbai", "New Delhi", "Hyderabad", "Pune", "Chennai", "Kolkata"],
  KE: ["Nairobi", "Mombasa", "Kisumu", "Nakuru"],
  NG: ["Lagos", "Abuja", "Ibadan", "Port Harcourt"],
  NL: ["Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven"],
  NZ: ["Auckland", "Wellington", "Christchurch", "Hamilton", "Dunedin"],
  SG: ["Singapore"],
  US: ["New York City", "San Francisco", "Los Angeles", "Chicago", "Austin", "Seattle", "Boston"],
  ZA: ["Cape Town", "Johannesburg", "Durban", "Pretoria", "Gqeberha", "Stellenbosch"]
};

let cachedCountries: readonly LocationCountryOption[] | null = null;
const cachedCountriesByCode = new Map<string, LocationCountryOption>();
const cachedCityOptionsByCountry = new Map<string, readonly LocationCityOption[]>();
const cachedCityOptionsById = new Map<string, LocationCityOption>();
const importantCityLookup = new Map<string, string[]>();

function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function buildCountrySearchText(country: ICountry): string {
  const aliasText = COUNTRY_ALIASES[country.isoCode]?.join(" ") ?? "";
  return normalizeSearchValue([country.isoCode, country.name, aliasText].join(" "));
}

function parseCoordinate(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsedValue = Number.parseFloat(value);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function sortCountries(a: ICountry, b: ICountry): number {
  const aPriority = PRIORITY_COUNTRY_ORDER.indexOf(a.isoCode as (typeof PRIORITY_COUNTRY_ORDER)[number]);
  const bPriority = PRIORITY_COUNTRY_ORDER.indexOf(b.isoCode as (typeof PRIORITY_COUNTRY_ORDER)[number]);

  if (aPriority !== -1 || bPriority !== -1) {
    if (aPriority === -1) {
      return 1;
    }

    if (bPriority === -1) {
      return -1;
    }

    return aPriority - bPriority;
  }

  return a.name.localeCompare(b.name);
}

function getStateNamesByCode(countryCode: string): Map<string, string> {
  return new Map(
    State.getStatesOfCountry(countryCode).map((state) => [state.isoCode, state.name] as const)
  );
}

function buildCityId(city: ICity): string {
  const citySlug = normalizeSearchValue(city.name).replace(/\s+/g, "-");
  const stateSlug = normalizeSearchValue(city.stateCode || "na").replace(/\s+/g, "-");
  return `${city.countryCode}:${stateSlug}:${citySlug}`;
}

function buildImportantCityLookup(): void {
  if (importantCityLookup.size > 0) {
    return;
  }

  Object.entries(PRIORITY_CITY_NAMES_BY_COUNTRY).forEach(([countryCode, cityNames]) => {
    cityNames.forEach((cityName) => {
      const normalizedCityName = normalizeSearchValue(cityName);
      const current = importantCityLookup.get(normalizedCityName) ?? [];
      current.push(countryCode);
      importantCityLookup.set(normalizedCityName, current);
    });
  });
}

function buildCountries(): readonly LocationCountryOption[] {
  if (cachedCountries) {
    return cachedCountries;
  }

  cachedCountries = Country.getAllCountries()
    .slice()
    .sort(sortCountries)
    .map((country) => {
      const nextCountry: LocationCountryOption = {
        currency: country.currency,
        flag: country.flag,
        isoCode: country.isoCode,
        latitude: parseCoordinate(country.latitude),
        longitude: parseCoordinate(country.longitude),
        name: country.name,
        phoneCode: country.phonecode,
        searchText: buildCountrySearchText(country),
        timeZoneNames: country.timezones?.map((timezone) => timezone.zoneName) ?? []
      };

      cachedCountriesByCode.set(nextCountry.isoCode, nextCountry);
      return nextCountry;
    });

  buildImportantCityLookup();

  return cachedCountries;
}

function buildCityOptions(countryCode: string): readonly LocationCityOption[] {
  const normalizedCountryCode = countryCode.trim().toUpperCase();
  const cached = cachedCityOptionsByCountry.get(normalizedCountryCode);

  if (cached) {
    return cached;
  }

  const country = getLocationCountryByCode(normalizedCountryCode);

  if (!country) {
    cachedCityOptionsByCountry.set(normalizedCountryCode, []);
    return [];
  }

  const stateNamesByCode = getStateNamesByCode(normalizedCountryCode);
  const rawCities = City.getCitiesOfCountry(normalizedCountryCode) ?? [];
  const uniqueCities = new Map<string, ICity>();

  rawCities.forEach((city) => {
    uniqueCities.set(buildCityId(city), city);
  });

  const nameCounts = new Map<string, number>();

  Array.from(uniqueCities.values()).forEach((city) => {
    const normalizedName = normalizeSearchValue(city.name);
    nameCounts.set(normalizedName, (nameCounts.get(normalizedName) ?? 0) + 1);
  });

  const nextCities = Array.from(uniqueCities.values())
    .map((city) => {
      const stateName = stateNamesByCode.get(city.stateCode) ?? undefined;
      const normalizedName = normalizeSearchValue(city.name);
      const isDuplicateName = (nameCounts.get(normalizedName) ?? 0) > 1;
      const displayLabel =
        isDuplicateName && stateName ? `${city.name}, ${stateName}` : city.name;
      const selectionLabel = `${displayLabel}, ${country.name}`;
      const nextCity: LocationCityOption = {
        countryCode: country.isoCode,
        countryFlag: country.flag,
        countryLatitude: country.latitude,
        countryLongitude: country.longitude,
        countryName: country.name,
        displayLabel,
        id: buildCityId(city),
        latitude: parseCoordinate(city.latitude),
        longitude: parseCoordinate(city.longitude),
        name: city.name,
        phoneCode: country.phoneCode,
        searchText: normalizeSearchValue(
          [city.name, stateName, country.name, country.isoCode].filter(Boolean).join(" ")
        ),
        selectionLabel,
        stateCode: city.stateCode,
        stateName
      };

      cachedCityOptionsById.set(nextCity.id, nextCity);
      return nextCity;
    })
    .sort((a, b) => a.displayLabel.localeCompare(b.displayLabel));

  cachedCityOptionsByCountry.set(normalizedCountryCode, nextCities);

  return nextCities;
}

function getPriorityCityRank(countryCode: string, city: LocationCityOption): number {
  const priorityCityNames = PRIORITY_CITY_NAMES_BY_COUNTRY[countryCode];

  if (!priorityCityNames) {
    return Number.POSITIVE_INFINITY;
  }

  const normalizedCityName = normalizeSearchValue(city.name);
  const rank = priorityCityNames.findIndex(
    (priorityName) => normalizeSearchValue(priorityName) === normalizedCityName
  );

  return rank === -1 ? Number.POSITIVE_INFINITY : rank;
}

function scoreCountryQuery(country: LocationCountryOption, query: string): number {
  if (!query) {
    return 0;
  }

  const normalizedName = normalizeSearchValue(country.name);
  const normalizedCode = country.isoCode.toLowerCase();

  if (normalizedCode === query) {
    return 0;
  }

  if (normalizedName === query) {
    return 1;
  }

  if (normalizedName.startsWith(query)) {
    return 2;
  }

  if (country.searchText.includes(` ${query}`)) {
    return 3;
  }

  if (country.searchText.includes(query)) {
    return 4;
  }

  return Number.POSITIVE_INFINITY;
}

function scoreCityQuery(city: LocationCityOption, query: string): number {
  if (!query) {
    return 0;
  }

  const normalizedDisplayLabel = normalizeSearchValue(city.displayLabel);
  const normalizedName = normalizeSearchValue(city.name);

  if (normalizedDisplayLabel === query || normalizedName === query) {
    return 0;
  }

  if (normalizedDisplayLabel.startsWith(query) || normalizedName.startsWith(query)) {
    return 1;
  }

  if (city.searchText.includes(` ${query}`)) {
    return 2;
  }

  if (city.searchText.includes(query)) {
    return 3;
  }

  return Number.POSITIVE_INFINITY;
}

export function getDefaultLocationCountryCode(): string {
  return DEFAULT_COUNTRY_CODE;
}

export function getAllLocationCountries(): readonly LocationCountryOption[] {
  return buildCountries();
}

export function getLocationCountryByCode(
  countryCode: string | null | undefined
): LocationCountryOption | null {
  if (!countryCode) {
    return null;
  }

  buildCountries();
  return cachedCountriesByCode.get(countryCode.trim().toUpperCase()) ?? null;
}

export function searchLocationCountries(
  query: string,
  limit = 10
): readonly LocationCountryOption[] {
  const normalizedQuery = normalizeSearchValue(query);

  return buildCountries()
    .map((country) => ({
      country,
      score: scoreCountryQuery(country, normalizedQuery)
    }))
    .filter((entry) => entry.score !== Number.POSITIVE_INFINITY)
    .sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }

      return sortCountries(
        { isoCode: a.country.isoCode, name: a.country.name } as ICountry,
        { isoCode: b.country.isoCode, name: b.country.name } as ICountry
      );
    })
    .slice(0, limit)
    .map((entry) => entry.country);
}

export function findLocationCountryByQuery(
  query: string | null | undefined
): LocationCountryOption | null {
  const normalizedQuery = normalizeSearchValue(query ?? "");

  if (!normalizedQuery) {
    return null;
  }

  return searchLocationCountries(query ?? "", 1)[0] ?? null;
}

export function findLocationCountryFromLocationHint(
  locationHint: string | null | undefined
): LocationCountryOption | null {
  const normalizedLocationHint = normalizeSearchValue(locationHint ?? "");

  if (!normalizedLocationHint) {
    return null;
  }

  const exactCountryMatch = buildCountries().find((country) =>
    normalizedLocationHint.includes(normalizeSearchValue(country.name))
      ? true
      : (COUNTRY_ALIASES[country.isoCode] ?? []).some(
          (alias) => normalizeSearchValue(alias) === normalizedLocationHint
        )
  );

  if (exactCountryMatch) {
    return exactCountryMatch;
  }

  const directCountryMatch = findLocationCountryByQuery(normalizedLocationHint);

  if (directCountryMatch) {
    return directCountryMatch;
  }

  buildImportantCityLookup();
  const hintTokens = normalizedLocationHint.split(/\s*,\s*|\s+/).filter(Boolean);

  for (let index = hintTokens.length; index > 0; index -= 1) {
    const currentHint = hintTokens.slice(0, index).join(" ");
    const matchedCountries = importantCityLookup.get(currentHint);

    if (matchedCountries?.length) {
      return getLocationCountryByCode(matchedCountries[0]) ?? null;
    }
  }

  return null;
}

export function getCitiesForCountry(countryCode: string): readonly LocationCityOption[] {
  return buildCityOptions(countryCode);
}

export function getLocationCityById(
  countryCode: string,
  cityId: string | null | undefined
): LocationCityOption | null {
  if (!cityId) {
    return null;
  }

  const normalizedCountryCode = countryCode.trim().toUpperCase();
  buildCityOptions(normalizedCountryCode);

  const city = cachedCityOptionsById.get(cityId) ?? null;

  return city?.countryCode === normalizedCountryCode ? city : null;
}

export function findLocationCityInCountry(
  countryCode: string,
  cityName: string | null | undefined,
  stateCode?: string | null
): LocationCityOption | null {
  const normalizedCityName = normalizeSearchValue(cityName ?? "");

  if (!normalizedCityName) {
    return null;
  }

  const normalizedStateCode = stateCode?.trim().toUpperCase();

  return (
    buildCityOptions(countryCode).find((city) => {
      if (normalizeSearchValue(city.name) !== normalizedCityName) {
        return false;
      }

      if (normalizedStateCode && city.stateCode.toUpperCase() !== normalizedStateCode) {
        return false;
      }

      return true;
    }) ?? null
  );
}

export function getTopCitiesForCountry(
  countryCode: string,
  limit = 8
): readonly LocationCityOption[] {
  return buildCityOptions(countryCode)
    .slice()
    .sort((a, b) => {
      const aPriority = getPriorityCityRank(countryCode, a);
      const bPriority = getPriorityCityRank(countryCode, b);

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      return a.displayLabel.localeCompare(b.displayLabel);
    })
    .slice(0, limit);
}

export function searchCitiesInCountry(
  countryCode: string,
  query: string,
  limit = 10
): readonly LocationCityOption[] {
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) {
    return getTopCitiesForCountry(countryCode, limit);
  }

  return buildCityOptions(countryCode)
    .map((city) => ({
      city,
      priority: getPriorityCityRank(countryCode, city),
      score: scoreCityQuery(city, normalizedQuery)
    }))
    .filter((entry) => entry.score !== Number.POSITIVE_INFINITY)
    .sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }

      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }

      return a.city.displayLabel.localeCompare(b.city.displayLabel);
    })
    .slice(0, limit)
    .map((entry) => entry.city);
}

export function buildApplicationLocationValue(city: LocationCityOption): ApplicationLocationValue {
  return {
    cityId: city.id,
    cityLatitude: city.latitude,
    cityLongitude: city.longitude,
    cityName: city.name,
    countryCode: city.countryCode,
    countryFlag: city.countryFlag,
    countryLatitude: city.countryLatitude,
    countryLongitude: city.countryLongitude,
    countryName: city.countryName,
    label: city.selectionLabel,
    phoneCode: city.phoneCode,
    stateCode: city.stateCode || undefined,
    stateName: city.stateName
  };
}

export function isLocationValueValidForCountry(
  value: ApplicationLocationValue | null | undefined,
  countryCode: string | null | undefined
): boolean {
  if (!value || !countryCode) {
    return false;
  }

  return value.countryCode === countryCode.trim().toUpperCase();
}
