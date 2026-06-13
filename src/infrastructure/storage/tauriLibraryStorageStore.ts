import { invoke } from "@tauri-apps/api/core";
import type { ChapterId, MangaId } from "../../core/library";
import type { ReadingProgress } from "../../core/reader";
import type { LibraryStorageStore } from "../../core/storage";
import {
  type LibrarySnapshot,
  parseDatabaseInfo,
  parseLibrarySnapshot,
  parseOptionalLibrarySnapshot,
  parseOptionalStorageReadingProgress,
  parseStorageReadingProgress,
} from "../../core/storage";

type InvokeFunction = (command: string, args?: Record<string, unknown>) => Promise<unknown>;

export const createTauriLibraryStorageStore = (
  invokeCommand: InvokeFunction = invoke,
): LibraryStorageStore => ({
  async init() {
    return parseDatabaseInfo(await invokeCommand("storage_init_database"));
  },
  async saveLibrarySnapshot(snapshot: LibrarySnapshot) {
    return parseLibrarySnapshot(
      await invokeCommand("storage_upsert_library_snapshot", { snapshot }),
    );
  },
  async getLibrarySnapshot(mangaId: MangaId) {
    return parseOptionalLibrarySnapshot(
      await invokeCommand("storage_get_library_snapshot", { mangaId }),
    );
  },
  async saveReadingProgress(progress: ReadingProgress) {
    return parseStorageReadingProgress(
      await invokeCommand("storage_upsert_reading_progress", { progress }),
    );
  },
  async getReadingProgress(chapterId: ChapterId) {
    return parseOptionalStorageReadingProgress(
      await invokeCommand("storage_get_reading_progress", { chapterId }),
    );
  },
});
