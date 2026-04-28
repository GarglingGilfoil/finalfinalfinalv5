import { getAllLocationCountries, type LocationCountryOption } from "./location-data";

export interface NationalityOption {
  countryCode: string;
  countryName: string;
  flag: string;
  nationality: string;
  searchText: string;
}

const NATIONALITY_OVERRIDES: Record<string, string> = {
  AU: "Australian",
  BR: "Brazilian",
  CA: "Canadian",
  CN: "Chinese",
  DE: "German",
  ES: "Spanish",
  FR: "French",
  GB: "British",
  IN: "Indian",
  IE: "Irish",
  IT: "Italian",
  JP: "Japanese",
  KE: "Kenyan",
  NG: "Nigerian",
  NL: "Dutch",
  NZ: "New Zealander",
  PT: "Portuguese",
  SG: "Singaporean",
  US: "American",
  ZA: "South African",
  ZW: "Zimbabwean"
};

function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function buildNationalityName(country: LocationCountryOption): string {
  return NATIONALITY_OVERRIDES[country.isoCode] ?? country.name;
}

export function getNationalityOptions(): readonly NationalityOption[] {
  return getAllLocationCountries().map((country) => {
    const nationality = buildNationalityName(country);

    return {
      countryCode: country.isoCode,
      countryName: country.name,
      flag: country.flag,
      nationality,
      searchText: normalizeSearchValue(`${country.isoCode} ${country.name} ${nationality}`)
    };
  });
}

export function searchNationalities(query: string, limit = 12): NationalityOption[] {
  const normalizedQuery = normalizeSearchValue(query);

  return getNationalityOptions()
    .filter((option) => (normalizedQuery ? option.searchText.includes(normalizedQuery) : true))
    .slice(0, limit);
}

export function getNationalityByCountryCode(countryCode: string | null | undefined): NationalityOption | null {
  if (!countryCode) {
    return null;
  }

  return (
    getNationalityOptions().find(
      (option) => option.countryCode === countryCode.trim().toUpperCase()
    ) ?? null
  );
}
