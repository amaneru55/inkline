import * as z from "zod";

export const sourceKinds = [
  "local-folder",
  "local-archive",
  "online",
  "cloud",
  "generated",
] as const;

export const imageExtensions = ["avif", "gif", "jpeg", "jpg", "png", "webp"] as const;

export const mangaStatuses = ["unknown", "ongoing", "completed", "hiatus"] as const;

export const sourceKindSchema = z.enum(sourceKinds);
export const imageExtensionSchema = z.enum(imageExtensions);
export const mangaStatusSchema = z.enum(mangaStatuses);

export const mangaIdSchema = z.custom<MangaId>(
  (value) => typeof value === "string" && value.startsWith("manga:"),
);
export const chapterIdSchema = z.custom<ChapterId>(
  (value) => typeof value === "string" && value.startsWith("chapter:"),
);
export const pageIdSchema = z.custom<PageId>(
  (value) => typeof value === "string" && value.startsWith("page:"),
);
export const sourceIdSchema = z.custom<SourceId>(
  (value) => typeof value === "string" && value.startsWith("source:"),
);
export const libraryItemIdSchema = z.custom<LibraryItemId>(
  (value) => typeof value === "string" && value.startsWith("library-item:"),
);

export const sourceRefSchema = z.object({
  id: sourceIdSchema,
  kind: sourceKindSchema,
  name: z.string().min(1),
});

export const pageResourceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("file"),
    path: z.string().min(1),
  }),
  z.object({
    archivePath: z.string().min(1),
    entryPath: z.string().min(1),
    kind: z.literal("archive-entry"),
  }),
  z.object({
    kind: z.literal("remote"),
    url: z.string().url(),
  }),
  z.object({
    kind: z.literal("generated"),
    key: z.string().min(1),
  }),
]);

export const mangaSchema = z.object({
  id: mangaIdSchema,
  title: z.string().min(1),
  authors: z.array(z.string().min(1)),
  status: mangaStatusSchema,
  source: sourceRefSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const chapterSchema = z.object({
  id: chapterIdSchema,
  mangaId: mangaIdSchema,
  title: z.string().min(1),
  index: z.number().int().nonnegative(),
  source: sourceRefSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const pageSchema = z.object({
  id: pageIdSchema,
  chapterId: chapterIdSchema,
  index: z.number().int().nonnegative(),
  resource: pageResourceSchema,
  displayName: z.string().min(1),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const libraryItemSchema = z.object({
  id: libraryItemIdSchema,
  mangaId: mangaIdSchema,
  title: z.string().min(1),
  favorite: z.boolean(),
  tags: z.array(z.string().min(1)),
  rating: z.number().min(0).max(5).nullable(),
  lastReadAt: z.string().min(1).nullable(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const folderImportFileSchema = z.object({
  path: z.string().min(1),
});

export const folderImportPlanSchema = z.object({
  source: sourceRefSchema,
  manga: mangaSchema,
  chapter: chapterSchema,
  pages: z.array(pageSchema),
});

export type SourceKind = (typeof sourceKinds)[number];
export type ImageExtension = (typeof imageExtensions)[number];
export type MangaStatus = (typeof mangaStatuses)[number];

export type MangaId = `manga:${string}`;
export type ChapterId = `chapter:${string}`;
export type PageId = `page:${string}`;
export type SourceId = `source:${string}`;
export type LibraryItemId = `library-item:${string}`;

export type SourceRef = {
  id: SourceId;
  kind: SourceKind;
  name: string;
};

export type PageResource =
  | {
      kind: "file";
      path: string;
    }
  | {
      archivePath: string;
      entryPath: string;
      kind: "archive-entry";
    }
  | {
      kind: "remote";
      url: string;
    }
  | {
      kind: "generated";
      key: string;
    };

export type Manga = {
  id: MangaId;
  title: string;
  authors: readonly string[];
  status: MangaStatus;
  source: SourceRef;
  createdAt: string;
  updatedAt: string;
};

export type Chapter = {
  id: ChapterId;
  mangaId: MangaId;
  title: string;
  index: number;
  source: SourceRef;
  createdAt: string;
  updatedAt: string;
};

export type Page = {
  id: PageId;
  chapterId: ChapterId;
  index: number;
  resource: PageResource;
  displayName: string;
  width?: number;
  height?: number;
};

export type LibraryItem = {
  id: LibraryItemId;
  mangaId: MangaId;
  title: string;
  favorite: boolean;
  tags: readonly string[];
  rating: number | null;
  lastReadAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FolderImportFile = {
  path: string;
};

export type FolderImportPlan = {
  source: SourceRef;
  manga: Manga;
  chapter: Chapter;
  pages: readonly Page[];
};

export const parseSourceRef = (value: unknown): SourceRef => sourceRefSchema.parse(value);
export const parsePageResource = (value: unknown): PageResource => pageResourceSchema.parse(value);
export const parseManga = (value: unknown): Manga => mangaSchema.parse(value);
export const parseChapter = (value: unknown): Chapter => chapterSchema.parse(value);
export const parsePage = (value: unknown): Page => pageSchema.parse(value);
export const parseLibraryItem = (value: unknown): LibraryItem => libraryItemSchema.parse(value);
export const parseFolderImportFile = (value: unknown): FolderImportFile =>
  folderImportFileSchema.parse(value);
export const parseFolderImportPlan = (value: unknown): FolderImportPlan =>
  folderImportPlanSchema.parse(value);
