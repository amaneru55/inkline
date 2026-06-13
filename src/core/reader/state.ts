import type { ChapterId, PageId } from "../library";
import type { ReaderPreferences, ReaderState, ReadingProgress } from "./schema";
import { defaultReaderPreferences } from "./schema";

export const clampPageIndex = (pageIndex: number, pageCount: number): number => {
  if (pageCount <= 0) {
    return 0;
  }

  if (pageIndex < 0) {
    return 0;
  }

  if (pageIndex >= pageCount) {
    return pageCount - 1;
  }

  return pageIndex;
};

export const createReaderState = ({
  chapterId,
  currentPageIndex = 0,
  pageIds,
  preferences = defaultReaderPreferences,
}: {
  chapterId: ChapterId;
  currentPageIndex?: number;
  pageIds: readonly PageId[];
  preferences?: ReaderPreferences;
}): ReaderState => ({
  chapterId,
  pageIds,
  currentPageIndex: clampPageIndex(currentPageIndex, pageIds.length),
  preferences: {
    ...preferences,
    preloadAfter: Math.max(0, preferences.preloadAfter),
    preloadBefore: Math.max(0, preferences.preloadBefore),
  },
});

export const getCurrentPageId = (state: ReaderState): PageId | null =>
  state.pageIds[state.currentPageIndex] ?? null;

export const goToPage = (state: ReaderState, pageIndex: number): ReaderState => ({
  ...state,
  currentPageIndex: clampPageIndex(pageIndex, state.pageIds.length),
});

export const goToPageId = (state: ReaderState, pageId: PageId): ReaderState => {
  const pageIndex = state.pageIds.indexOf(pageId);

  return pageIndex === -1 ? state : goToPage(state, pageIndex);
};

export const goToNextPage = (state: ReaderState): ReaderState =>
  goToPage(state, state.currentPageIndex + 1);

export const goToPreviousPage = (state: ReaderState): ReaderState =>
  goToPage(state, state.currentPageIndex - 1);

export const getPreloadPageIds = (state: ReaderState): readonly PageId[] => {
  const currentPageId = getCurrentPageId(state);

  if (currentPageId === null) {
    return [];
  }

  const startIndex = Math.max(0, state.currentPageIndex - state.preferences.preloadBefore);
  const endIndex = Math.min(
    state.pageIds.length,
    state.currentPageIndex + state.preferences.preloadAfter + 1,
  );

  return state.pageIds.slice(startIndex, endIndex);
};

export const createReadingProgress = (state: ReaderState, updatedAt: string): ReadingProgress => ({
  chapterId: state.chapterId,
  pageId: getCurrentPageId(state),
  pageIndex: state.currentPageIndex,
  pageCount: state.pageIds.length,
  completed: state.pageIds.length > 0 && state.currentPageIndex === state.pageIds.length - 1,
  updatedAt,
});
