import type {
  Chapter,
  ChapterId,
  FolderImportFile,
  FolderImportPlan,
  ImageExtension,
  Manga,
  MangaId,
  Page,
  PageId,
  SourceId,
  SourceRef,
} from "./schema";
import { imageExtensions } from "./schema";

const pathSeparatorPattern = /[/\\]+/u;
const extensionPattern = /\.([^.\\/]+)$/u;
const extensionStripPattern = /\.[^.\\/]+$/u;
const whitespacePattern = /\s+/gu;
const unsafeIdPattern = /[^a-z0-9]+/gu;
const idTrimPattern = /^-+|-+$/gu;

const naturalCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

const isImageExtension = (value: string): value is ImageExtension =>
  imageExtensions.some((extension) => extension === value);

export const getFileExtension = (path: string): ImageExtension | null => {
  const match = extensionPattern.exec(path);
  const extension = match?.[1]?.toLowerCase();

  return extension !== undefined && isImageExtension(extension) ? extension : null;
};

export const isSupportedImagePath = (path: string): boolean => getFileExtension(path) !== null;

export const splitPath = (path: string): readonly string[] =>
  path
    .split(pathSeparatorPattern)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

export const getBaseName = (path: string): string => {
  const parts = splitPath(path);

  return parts[parts.length - 1] ?? path;
};

export const getNameWithoutExtension = (path: string): string =>
  getBaseName(path).replace(extensionStripPattern, "");

export const getParentName = (path: string): string | null => {
  const parts = splitPath(path);

  return parts.length > 1 ? (parts[parts.length - 2] ?? null) : null;
};

export const compareNaturalPaths = (left: string, right: string): number => {
  const leftParts = splitPath(left);
  const rightParts = splitPath(right);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = leftParts[index];
    const rightPart = rightParts[index];

    if (leftPart === undefined) {
      return -1;
    }

    if (rightPart === undefined) {
      return 1;
    }

    const comparison = naturalCollator.compare(leftPart, rightPart);

    if (comparison !== 0) {
      return comparison;
    }
  }

  return 0;
};

export const createStableSlug = (value: string): string => {
  const normalized = value.trim().toLowerCase().replace(whitespacePattern, "-");
  const slug = normalized.replace(unsafeIdPattern, "-").replace(idTrimPattern, "");

  return slug.length > 0 ? slug : "untitled";
};

export const createLocalFolderSource = (folderName: string): SourceRef => {
  const slug = createStableSlug(folderName);

  return {
    id: `source:local-folder:${slug}` as SourceId,
    kind: "local-folder",
    name: folderName,
  };
};

export const createFolderImportPlan = (
  files: readonly FolderImportFile[],
  importedAt: string,
): FolderImportPlan => {
  const imagePaths = files
    .map((file) => file.path)
    .filter(isSupportedImagePath)
    .sort(compareNaturalPaths);

  const firstImagePath = imagePaths[0];
  const folderName =
    firstImagePath === undefined ? "Untitled" : (getParentName(firstImagePath) ?? "Untitled");
  const slug = createStableSlug(folderName);
  const source = createLocalFolderSource(folderName);
  const mangaId = `manga:${slug}` as MangaId;
  const chapterId = `chapter:${slug}:001` as ChapterId;
  const manga: Manga = {
    id: mangaId,
    title: folderName,
    authors: [],
    status: "unknown",
    source,
    createdAt: importedAt,
    updatedAt: importedAt,
  };
  const chapter: Chapter = {
    id: chapterId,
    mangaId,
    title: folderName,
    index: 0,
    source,
    createdAt: importedAt,
    updatedAt: importedAt,
  };
  const pages: readonly Page[] = imagePaths.map((path, index) => ({
    id: `page:${slug}:${String(index + 1).padStart(4, "0")}` as PageId,
    chapterId,
    index,
    resource: {
      kind: "file",
      path,
    },
    displayName: getNameWithoutExtension(path),
  }));

  return {
    source,
    manga,
    chapter,
    pages,
  };
};
