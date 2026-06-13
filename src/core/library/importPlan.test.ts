import { describe, expect, it } from "vitest";
import {
  compareNaturalPaths,
  createFolderImportPlan,
  createStableSlug,
  getBaseName,
  getFileExtension,
  getNameWithoutExtension,
  getParentName,
  isSupportedImagePath,
  splitPath,
} from "./importPlan";
import { parseFolderImportPlan, parsePageResource } from "./schema";

describe("library import plan", () => {
  it("detects supported image extensions case-insensitively", () => {
    expect(getFileExtension("cover.JPG")).toBe("jpg");
    expect(getFileExtension("page.001.avif")).toBe("avif");
    expect(getFileExtension("notes.txt")).toBeNull();
    expect(isSupportedImagePath("nested/page.webp")).toBe(true);
    expect(isSupportedImagePath("nested/page.svg")).toBe(false);
  });

  it("parses portable path segments and names", () => {
    expect(splitPath("D:\\Manga\\Chapter 1\\001.png")).toEqual([
      "D:",
      "Manga",
      "Chapter 1",
      "001.png",
    ]);
    expect(getBaseName("/library/book/page 01.png")).toBe("page 01.png");
    expect(getNameWithoutExtension("/library/book/page 01.png")).toBe("page 01");
    expect(getParentName("/library/book/page 01.png")).toBe("book");
    expect(getParentName("page 01.png")).toBeNull();
  });

  it("sorts paths naturally by folder and file name", () => {
    const paths = [
      "book/chapter 10/001.png",
      "book/chapter 2/010.png",
      "book/chapter 2/002.png",
      "book/chapter 1/001.png",
    ];

    expect([...paths].sort(compareNaturalPaths)).toEqual([
      "book/chapter 1/001.png",
      "book/chapter 2/002.png",
      "book/chapter 2/010.png",
      "book/chapter 10/001.png",
    ]);
  });

  it("creates stable slugs for identifiers", () => {
    expect(createStableSlug("  Chapter 01: 墨线!  ")).toBe("chapter-01");
    expect(createStableSlug("???")).toBe("untitled");
  });

  it("creates a minimal folder import plan from image files", () => {
    const plan = createFolderImportPlan(
      [
        { path: "Inkline/010.png" },
        { path: "Inkline/readme.txt" },
        { path: "Inkline/002.png" },
        { path: "Inkline/001.jpg" },
      ],
      "2026-06-13T00:00:00.000Z",
    );

    expect(plan.source).toEqual({
      id: "source:local-folder:inkline",
      kind: "local-folder",
      name: "Inkline",
    });
    expect(plan.manga.title).toBe("Inkline");
    expect(plan.chapter.mangaId).toBe(plan.manga.id);
    expect(plan.pages.map((page) => page.displayName)).toEqual(["001", "002", "010"]);
    expect(plan.pages.map((page) => page.resource)).toEqual([
      { kind: "file", path: "Inkline/001.jpg" },
      { kind: "file", path: "Inkline/002.png" },
      { kind: "file", path: "Inkline/010.png" },
    ]);
    expect(parseFolderImportPlan(plan)).toEqual(plan);
  });

  it("creates an empty untitled plan when no images are present", () => {
    const plan = createFolderImportPlan([{ path: "notes.txt" }], "2026-06-13T00:00:00.000Z");

    expect(plan.manga.id).toBe("manga:untitled");
    expect(plan.pages).toEqual([]);
  });

  it("rejects invalid boundary page resources", () => {
    expect(parsePageResource({ kind: "remote", url: "https://example.com/page.png" })).toEqual({
      kind: "remote",
      url: "https://example.com/page.png",
    });
    expect(() => parsePageResource({ kind: "remote", url: "not-a-url" })).toThrow();
  });
});
