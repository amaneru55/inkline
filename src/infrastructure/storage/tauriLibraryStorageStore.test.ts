import { describe, expect, it } from "vitest";
import type { ReadingProgress } from "../../core/reader";
import type { LibrarySnapshot } from "../../core/storage";
import { createTauriLibraryStorageStore } from "./tauriLibraryStorageStore";

const createdAt = "2026-06-13T12:00:00Z";
const source = {
  id: "source:local",
  kind: "local-folder",
  name: "Local",
} as const;

const snapshot = {
  source,
  manga: {
    id: "manga:one",
    title: "One",
    authors: ["A. Writer"],
    status: "ongoing",
    source,
    createdAt,
    updatedAt: createdAt,
  },
  chapters: [
    {
      id: "chapter:one",
      mangaId: "manga:one",
      title: "Chapter 1",
      index: 0,
      source,
      createdAt,
      updatedAt: createdAt,
    },
  ],
  pages: [
    {
      id: "page:one",
      chapterId: "chapter:one",
      index: 0,
      resource: {
        kind: "file",
        path: "D:/library/one/001.png",
      },
      displayName: "001.png",
    },
  ],
  libraryItem: {
    id: "library-item:one",
    mangaId: "manga:one",
    title: "One",
    favorite: true,
    tags: ["demo"],
    rating: 4.5,
    lastReadAt: null,
    createdAt,
    updatedAt: createdAt,
  },
} as const satisfies LibrarySnapshot;

describe("createTauriLibraryStorageStore", () => {
  it("normalizes command responses", async () => {
    const calls: string[] = [];
    const store = createTauriLibraryStorageStore(async (command) => {
      calls.push(command);

      if (command === "storage_init_database") {
        return { path: "D:/data/library.sqlite3", schemaVersion: 1 };
      }

      if (command === "storage_get_library_snapshot") {
        return snapshot;
      }

      return null;
    });

    await expect(store.init()).resolves.toEqual({
      path: "D:/data/library.sqlite3",
      schemaVersion: 1,
    });
    await expect(store.getLibrarySnapshot("manga:one")).resolves.toEqual(snapshot);
    expect(calls).toEqual(["storage_init_database", "storage_get_library_snapshot"]);
  });

  it("persists reading progress through the typed boundary", async () => {
    const progress = {
      chapterId: "chapter:one",
      pageId: "page:one",
      pageIndex: 0,
      pageCount: 1,
      completed: false,
      updatedAt: createdAt,
    } as const satisfies ReadingProgress;

    const store = createTauriLibraryStorageStore(async (_command, args) => {
      return args?.progress ?? null;
    });

    await expect(store.saveReadingProgress(progress)).resolves.toEqual(progress);
  });
});
