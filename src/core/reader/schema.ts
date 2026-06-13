import * as z from "zod";
import type { ChapterId, PageId } from "../library";
import { chapterIdSchema, pageIdSchema } from "../library";

export const readingDirections = ["left-to-right", "right-to-left", "vertical"] as const;
export const readerLayoutModes = ["single-page", "double-page", "long-strip"] as const;

export const readingDirectionSchema = z.enum(readingDirections);
export const readerLayoutModeSchema = z.enum(readerLayoutModes);

export const readerPreferencesSchema = z.object({
  direction: readingDirectionSchema,
  layoutMode: readerLayoutModeSchema,
  preloadBefore: z.number().int().nonnegative(),
  preloadAfter: z.number().int().nonnegative(),
});

export const readingProgressSchema = z.object({
  chapterId: chapterIdSchema,
  pageId: pageIdSchema.nullable(),
  pageIndex: z.number().int().nonnegative(),
  pageCount: z.number().int().nonnegative(),
  completed: z.boolean(),
  updatedAt: z.string().min(1),
});

export type ReadingDirection = (typeof readingDirections)[number];
export type ReaderLayoutMode = (typeof readerLayoutModes)[number];

export type ReaderPreferences = {
  direction: ReadingDirection;
  layoutMode: ReaderLayoutMode;
  preloadBefore: number;
  preloadAfter: number;
};

export type ReaderState = {
  chapterId: ChapterId;
  pageIds: readonly PageId[];
  currentPageIndex: number;
  preferences: ReaderPreferences;
};

export type ReadingProgress = {
  chapterId: ChapterId;
  pageId: PageId | null;
  pageIndex: number;
  pageCount: number;
  completed: boolean;
  updatedAt: string;
};

export const defaultReaderPreferences = {
  direction: "right-to-left",
  layoutMode: "single-page",
  preloadBefore: 1,
  preloadAfter: 2,
} as const satisfies ReaderPreferences;

export const parseReaderPreferences = (value: unknown): ReaderPreferences =>
  readerPreferencesSchema.parse(value);

export const parseReadingProgress = (value: unknown): ReadingProgress =>
  readingProgressSchema.parse(value);
