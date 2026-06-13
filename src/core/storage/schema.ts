import * as z from "zod";
import {
  chapterSchema,
  libraryItemSchema,
  mangaSchema,
  pageSchema,
  sourceRefSchema,
} from "../library";
import { readingProgressSchema } from "../reader";

export const databaseInfoSchema = z.object({
  path: z.string().min(1),
  schemaVersion: z.number().int().positive(),
});

export const librarySnapshotSchema = z.object({
  source: sourceRefSchema,
  manga: mangaSchema,
  chapters: z.array(chapterSchema),
  pages: z.array(pageSchema),
  libraryItem: libraryItemSchema,
});

export type DatabaseInfo = z.infer<typeof databaseInfoSchema>;
export type LibrarySnapshot = z.infer<typeof librarySnapshotSchema>;
export type StorageReadingProgress = z.infer<typeof readingProgressSchema>;

export const parseDatabaseInfo = (value: unknown): DatabaseInfo => databaseInfoSchema.parse(value);

export const parseLibrarySnapshot = (value: unknown): LibrarySnapshot =>
  librarySnapshotSchema.parse(value);

export const parseOptionalLibrarySnapshot = (value: unknown): LibrarySnapshot | null =>
  z.union([librarySnapshotSchema, z.null()]).parse(value);

export const parseStorageReadingProgress = (value: unknown): StorageReadingProgress =>
  readingProgressSchema.parse(value);

export const parseOptionalStorageReadingProgress = (
  value: unknown,
): StorageReadingProgress | null => z.union([readingProgressSchema, z.null()]).parse(value);
