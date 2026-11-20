import { TestBed } from "@angular/core/testing";
import { EN_TRANSLATIONS } from "../../../../app/core/i18n/en";
import { ES_TRANSLATIONS } from "../../../../app/core/i18n/es";
import { I18nService } from "../../../../app/core/i18n/i18n.service";
import { PT_BR_TRANSLATIONS } from "../../../../app/core/i18n/pt-BR";

function flattenEntries(
  obj: Record<string, unknown>,
  prefix = "",
): Array<[string, string]> {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return flattenEntries(value as Record<string, unknown>, path);
    }
    return [[path, String(value ?? "")]];
  });
}

describe("I18nService", () => {
  function create(browserLanguage: string): I18nService {
    vi.spyOn(navigator, "language", "get").mockReturnValue(browserLanguage);
    return TestBed.inject(I18nService);
  }

  afterEach(() => vi.restoreAllMocks());

  it.each(["es", "es-419", "es-BO"])(
    "uses es for browser language %s",
    (language) => {
      expect(create(language).currentLang()).toBe("es");
    },
  );

  it.each(["en-US", "fr"])("uses en for browser language %s", (language) => {
    expect(create(language).currentLang()).toBe("en");
  });

  it.each(["pt", "pt-BR", "pt-PT"])(
    "uses pt-BR for browser language %s",
    (language) => {
      expect(create(language).currentLang()).toBe("pt-BR");
    },
  );

  it("ignores a language saved in localStorage", () => {
    localStorage.setItem("lang", "es");

    expect(create("en-US").currentLang()).toBe("en");

    localStorage.clear();
  });

  it("translates keys after init in the browser language", async () => {
    const i18n = create("es-BO");
    await i18n.init();

    expect(i18n.translate("common.save")).toBe("Guardar");
  });

  it("returns the key when it is missing", async () => {
    const i18n = create("en-US");
    await i18n.init();

    expect(i18n.translate("missing.key")).toBe("missing.key");
  });

  it("translates keys in English for an English browser", async () => {
    const i18n = create("en-US");
    await i18n.init();

    expect(i18n.translate("common.save")).toBe("Save");
  });

  it("translates keys in Portuguese (Brazil) for a Portuguese browser", async () => {
    const i18n = create("pt-BR");
    await i18n.init();

    expect(i18n.translate("common.save")).toBe("Salvar");
  });

  it.each([
    ["es-BO", "es-ES"],
    ["en-US", "en-US"],
    ["pt-BR", "pt-BR"],
  ])("maps browser language %s to the Intl locale %s", (language, locale) => {
    expect(create(language).intlLocale()).toBe(locale);
  });

  it.each([
    ["es-BO", "es"],
    ["en-US", "en"],
    ["pt-BR", "pt-BR"],
  ])(
    "sets the document language for browser language %s on init",
    async (language, lang) => {
      const i18n = create(language);
      document.documentElement.lang = "xx";

      await i18n.init();

      expect(document.documentElement.lang).toBe(lang);
    },
  );

  it("has exact key parity and non-empty values across all dictionaries", () => {
    const esEntries = flattenEntries(ES_TRANSLATIONS);
    const enEntries = flattenEntries(EN_TRANSLATIONS);
    const ptEntries = flattenEntries(PT_BR_TRANSLATIONS);

    const esKeys = esEntries.map(([k]) => k).sort();
    const enKeys = enEntries.map(([k]) => k).sort();
    const ptKeys = ptEntries.map(([k]) => k).sort();

    expect(enKeys).toEqual(esKeys);
    expect(ptKeys).toEqual(esKeys);

    for (const [key, value] of [...esEntries, ...enEntries, ...ptEntries]) {
      expect(
        value.trim().length,
        `Empty value for key "${key}"`,
      ).toBeGreaterThan(0);
    }
  });
});
