export interface CandidateLanguageOption {
  code: string;
  name: string;
  searchText: string;
}

const LANGUAGE_NAMES = [
  ["af", "Afrikaans"],
  ["ar", "Arabic"],
  ["bn", "Bengali"],
  ["bg", "Bulgarian"],
  ["ca", "Catalan"],
  ["zh", "Chinese"],
  ["hr", "Croatian"],
  ["cs", "Czech"],
  ["da", "Danish"],
  ["nl", "Dutch"],
  ["en", "English"],
  ["et", "Estonian"],
  ["fi", "Finnish"],
  ["fr", "French"],
  ["de", "German"],
  ["el", "Greek"],
  ["gu", "Gujarati"],
  ["he", "Hebrew"],
  ["hi", "Hindi"],
  ["hu", "Hungarian"],
  ["id", "Indonesian"],
  ["it", "Italian"],
  ["ja", "Japanese"],
  ["ko", "Korean"],
  ["lv", "Latvian"],
  ["lt", "Lithuanian"],
  ["ms", "Malay"],
  ["mr", "Marathi"],
  ["no", "Norwegian"],
  ["fa", "Persian"],
  ["pl", "Polish"],
  ["pt", "Portuguese"],
  ["pa", "Punjabi"],
  ["ro", "Romanian"],
  ["ru", "Russian"],
  ["sr", "Serbian"],
  ["sk", "Slovak"],
  ["sl", "Slovenian"],
  ["es", "Spanish"],
  ["sw", "Swahili"],
  ["sv", "Swedish"],
  ["ta", "Tamil"],
  ["te", "Telugu"],
  ["th", "Thai"],
  ["tr", "Turkish"],
  ["uk", "Ukrainian"],
  ["ur", "Urdu"],
  ["vi", "Vietnamese"],
  ["xh", "Xhosa"],
  ["zu", "Zulu"]
] as const;

function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export const LANGUAGE_OPTIONS: readonly CandidateLanguageOption[] = LANGUAGE_NAMES.map(
  ([code, name]) => ({
    code,
    name,
    searchText: normalizeSearchValue(`${code} ${name}`)
  })
);

export function searchLanguages(query: string, excludedCodes: readonly string[] = []): CandidateLanguageOption[] {
  const normalizedQuery = normalizeSearchValue(query.trim());
  const excluded = new Set(excludedCodes.map((code) => code.toLowerCase()));

  return LANGUAGE_OPTIONS.filter((language) => {
    if (excluded.has(language.code.toLowerCase())) {
      return false;
    }

    return normalizedQuery ? language.searchText.includes(normalizedQuery) : true;
  }).slice(0, normalizedQuery ? 12 : 10);
}
