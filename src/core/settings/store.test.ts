import { describe, expect, it } from "vitest";
import { defaultSettings } from "./schema";
import { createMemorySettingsStore } from "./store";

describe("memory settings store", () => {
  it("loads default settings", async () => {
    const store = createMemorySettingsStore();

    await expect(store.load()).resolves.toEqual(defaultSettings);
  });

  it("normalizes saved settings", async () => {
    const store = createMemorySettingsStore();

    await expect(
      store.save({
        themeName: "default",
        themeMode: "dark",
        language: "en-US",
        closeBehavior: "exit",
      }),
    ).resolves.toEqual({
      themeName: "default",
      themeMode: "dark",
      language: "en-US",
      closeBehavior: "exit",
    });

    await expect(store.load()).resolves.toEqual({
      themeName: "default",
      themeMode: "dark",
      language: "en-US",
      closeBehavior: "exit",
    });
  });
});
