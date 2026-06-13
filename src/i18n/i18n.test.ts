import { describe, expect, it } from "vitest";
import { i18next } from ".";

describe("i18n", () => {
  it("uses simplified Chinese as the default locale", () => {
    expect(i18next.t("app.title")).toBe("墨线漫画阅读器");
  });

  it("falls back to English for missing locale variants", async () => {
    await i18next.changeLanguage("en-US");

    expect(i18next.t("app.title")).toBe("Inkline Comic Reader");

    await i18next.changeLanguage("zh-CN");
  });
});
