import { describe, expect, it } from "vitest";
import type { ChapterId, PageId } from "../library";
import { parseReaderPreferences, parseReadingProgress } from "./schema";
import {
  clampPageIndex,
  createReaderState,
  createReadingProgress,
  getCurrentPageId,
  getPreloadPageIds,
  goToNextPage,
  goToPage,
  goToPageId,
  goToPreviousPage,
} from "./state";

const chapterId = "chapter:inkline:001" as ChapterId;
const pageIds = ["page:inkline:0001", "page:inkline:0002", "page:inkline:0003"].map(
  (pageId) => pageId as PageId,
);

describe("reader state", () => {
  it("clamps page indexes to available pages", () => {
    expect(clampPageIndex(-1, 3)).toBe(0);
    expect(clampPageIndex(1, 3)).toBe(1);
    expect(clampPageIndex(9, 3)).toBe(2);
    expect(clampPageIndex(9, 0)).toBe(0);
  });

  it("creates reader state with normalized preferences", () => {
    const state = createReaderState({
      chapterId,
      currentPageIndex: 9,
      pageIds,
      preferences: {
        direction: "left-to-right",
        layoutMode: "double-page",
        preloadAfter: -1,
        preloadBefore: -2,
      },
    });

    expect(state.currentPageIndex).toBe(2);
    expect(state.preferences).toEqual({
      direction: "left-to-right",
      layoutMode: "double-page",
      preloadAfter: 0,
      preloadBefore: 0,
    });
    expect(parseReaderPreferences(state.preferences)).toEqual(state.preferences);
  });

  it("navigates by index and page id without mutating state", () => {
    const state = createReaderState({ chapterId, pageIds });
    const nextState = goToNextPage(state);
    const targetState = goToPageId(nextState, pageIds[2]);

    expect(getCurrentPageId(state)).toBe(pageIds[0]);
    expect(getCurrentPageId(nextState)).toBe(pageIds[1]);
    expect(getCurrentPageId(targetState)).toBe(pageIds[2]);
    expect(goToPreviousPage(targetState).currentPageIndex).toBe(1);
    expect(goToPage(targetState, 99).currentPageIndex).toBe(2);
    expect(goToPageId(targetState, "page:missing" as PageId)).toBe(targetState);
  });

  it("returns null current page for empty chapters", () => {
    const state = createReaderState({ chapterId, pageIds: [] });

    expect(getCurrentPageId(state)).toBeNull();
    expect(getPreloadPageIds(state)).toEqual([]);
  });

  it("calculates preload windows around the current page", () => {
    const state = createReaderState({
      chapterId,
      currentPageIndex: 1,
      pageIds,
      preferences: {
        direction: "right-to-left",
        layoutMode: "single-page",
        preloadAfter: 1,
        preloadBefore: 1,
      },
    });

    expect(getPreloadPageIds(state)).toEqual(pageIds);
  });

  it("creates reading progress snapshots", () => {
    const state = createReaderState({ chapterId, currentPageIndex: 2, pageIds });

    const progress = createReadingProgress(state, "2026-06-13T00:00:00.000Z");

    expect(progress).toEqual({
      chapterId,
      pageId: pageIds[2],
      pageIndex: 2,
      pageCount: 3,
      completed: true,
      updatedAt: "2026-06-13T00:00:00.000Z",
    });
    expect(parseReadingProgress(progress)).toEqual(progress);
    expect(() => parseReadingProgress({ ...progress, pageIndex: -1 })).toThrow();
  });
});
