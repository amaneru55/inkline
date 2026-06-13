import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getThemeFullName,
  resolveColorMode,
  resolveStoredThemeMode,
  resolveStoredThemeName,
  ThemeProvider,
  useInklineTheme,
} from "./theme";

class TestMediaQueryList extends EventTarget implements MediaQueryList {
  matches: boolean;
  readonly media = "(prefers-color-scheme: dark)";
  onchange: ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null = null;

  constructor(matches: boolean) {
    super();
    this.matches = matches;
  }

  addListener(listener: ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null) {
    if (listener !== null) {
      this.addEventListener("change", listener as EventListener);
    }
  }

  removeListener(listener: ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null) {
    if (listener !== null) {
      this.removeEventListener("change", listener as EventListener);
    }
  }

  setMatches(matches: boolean) {
    this.matches = matches;
    const event = new Event("change") as MediaQueryListEvent;
    Object.defineProperty(event, "matches", { value: matches });
    Object.defineProperty(event, "media", { value: this.media });
    this.dispatchEvent(event);
    this.onchange?.call(this, event);
  }
}

let mediaQueryList: TestMediaQueryList;

function ThemeProbe() {
  const { resolvedColorMode, setThemeMode, setThemeName, themeFullName, themeMode, themeName } =
    useInklineTheme();

  return (
    <div>
      <output aria-label="theme-name">{themeName}</output>
      <output aria-label="theme-mode">{themeMode}</output>
      <output aria-label="color-mode">{resolvedColorMode}</output>
      <output aria-label="theme-full-name">{themeFullName}</output>
      <button onClick={() => setThemeName("default")} type="button">
        default
      </button>
      <button onClick={() => setThemeMode("dark")} type="button">
        dark
      </button>
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    mediaQueryList = new TestMediaQueryList(false);
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => mediaQueryList),
    );
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-name");
    document.documentElement.removeAttribute("data-theme-mode");
    document.documentElement.removeAttribute("data-color-mode");
    document.documentElement.removeAttribute("style");
    document.documentElement.className = "";
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("resolves stored theme names and modes", () => {
    expect(resolveStoredThemeName("default")).toBe("default");
    expect(resolveStoredThemeName("unknown")).toBe("inkline");
    expect(resolveStoredThemeName(null)).toBe("inkline");
    expect(resolveStoredThemeMode("system")).toBe("system");
    expect(resolveStoredThemeMode("dark")).toBe("dark");
    expect(resolveStoredThemeMode("unknown")).toBe("system");
  });

  it("resolves full theme names from theme and color mode", () => {
    expect(resolveColorMode("system", true)).toBe("dark");
    expect(resolveColorMode("system", false)).toBe("light");
    expect(resolveColorMode("light", true)).toBe("light");
    expect(getThemeFullName("default", "dark")).toBe("dark");
    expect(getThemeFullName("inkline", "light")).toBe("inkline-light");
  });

  it("uses stored theme name and mode as initial values", () => {
    window.localStorage.setItem("inkline.theme.name", "default");
    window.localStorage.setItem("inkline.theme.mode", "dark");

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByLabelText("theme-name")).toHaveTextContent("default");
    expect(screen.getByLabelText("theme-mode")).toHaveTextContent("dark");
    expect(screen.getByLabelText("theme-full-name")).toHaveTextContent("dark");
  });

  it("migrates the legacy dark theme value into default dark mode", () => {
    window.localStorage.setItem("inkline.theme", "dark");

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByLabelText("theme-name")).toHaveTextContent("default");
    expect(screen.getByLabelText("theme-mode")).toHaveTextContent("dark");
  });

  it("applies selected theme attributes to the document element", async () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "dark" }));
    await userEvent.click(screen.getByRole("button", { name: "default" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.dataset.themeName).toBe("default");
    expect(document.documentElement.dataset.themeMode).toBe("dark");
    expect(document.documentElement.dataset.colorMode).toBe("dark");
    expect(document.documentElement).toHaveClass("dark");
  });

  it("tracks system color mode while mode is system", () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByLabelText("color-mode")).toHaveTextContent("light");

    act(() => mediaQueryList.setMatches(true));

    expect(screen.getByLabelText("color-mode")).toHaveTextContent("dark");
    expect(document.documentElement.dataset.theme).toBe("inkline-dark");
  });

  it("throws when the hook is used outside ThemeProvider", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => render(<ThemeProbe />)).toThrow(
      "useInklineTheme must be used within ThemeProvider.",
    );
  });
});
