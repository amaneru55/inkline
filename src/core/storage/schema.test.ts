import { describe, expect, it } from "vitest";
import { parseDatabaseInfo, parseLibrarySnapshot } from "./schema";

const createdAt = "2026-06-13T12:00:00Z";
const source = {
  id: "source:local",
  kind: "local-folder",
  name: "Local",
} as const;

describe("storage boundary schemas", () => {
  it("parses database info from the Rust boundary", () => {
    expect(parseDatabaseInfo({ path: "D:/data/library.sqlite3", schemaVersion: 1 })).toEqual({
      path: "D:/data/library.sqlite3",
      schemaVersion: 1,
    });
  });

  it("parses a persisted library snapshot", () => {
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
    } as const;

    expect(parseLibrarySnapshot(snapshot)).toEqual(snapshot);
  });
});
