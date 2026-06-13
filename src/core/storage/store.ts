import type { MangaId } from "../library";
import type { ChapterId } from "../library/schema";
import type { ReadingProgress } from "../reader";
import type { DatabaseInfo, LibrarySnapshot } from "./schema";

export type LibraryStorageStore = {
  init(): Promise<DatabaseInfo>;
  importLocalFolder(path: string): Promise<LibrarySnapshot>;
  saveLibrarySnapshot(snapshot: LibrarySnapshot): Promise<LibrarySnapshot>;
  getLibrarySnapshot(mangaId: MangaId): Promise<LibrarySnapshot | null>;
  saveReadingProgress(progress: ReadingProgress): Promise<ReadingProgress>;
  getReadingProgress(chapterId: ChapterId): Promise<ReadingProgress | null>;
};
