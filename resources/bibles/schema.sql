PRAGMA foreign_keys = ON;

CREATE TABLE bible_versions (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'es',
  status TEXT NOT NULL DEFAULT 'stable',
  is_public_domain INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0,
  source_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CHECK (status IN ('stable', 'draft')),
  CHECK (is_public_domain IN (0, 1)),
  CHECK (is_default IN (0, 1))
);

CREATE UNIQUE INDEX idx_single_default_bible
ON bible_versions(is_default)
WHERE is_default = 1;

CREATE TABLE bible_books (
  code TEXT PRIMARY KEY,
  standard_name TEXT NOT NULL
);

CREATE TABLE bible_version_books (
  version_code TEXT NOT NULL,
  book_code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  abbreviation TEXT,
  position INTEGER NOT NULL,

  PRIMARY KEY (version_code, book_code),

  FOREIGN KEY (version_code)
    REFERENCES bible_versions(code)
    ON DELETE CASCADE,

  FOREIGN KEY (book_code)
    REFERENCES bible_books(code)
    ON DELETE CASCADE
);

CREATE TABLE bible_verses (
  version_code TEXT NOT NULL,
  book_code TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse_label TEXT NOT NULL,
  verse_start INTEGER NOT NULL,
  verse_end INTEGER NOT NULL,
  text TEXT NOT NULL,

  PRIMARY KEY (
    version_code,
    book_code,
    chapter,
    verse_label
  ),

  FOREIGN KEY (version_code, book_code)
    REFERENCES bible_version_books(version_code, book_code)
    ON DELETE CASCADE,

  CHECK (chapter > 0),
  CHECK (verse_start > 0),
  CHECK (verse_end >= verse_start)
);

CREATE TABLE bible_book_aliases (
  alias TEXT PRIMARY KEY,
  book_code TEXT NOT NULL,

  FOREIGN KEY (book_code)
    REFERENCES bible_books(code)
    ON DELETE CASCADE
);

CREATE INDEX idx_bible_reference
ON bible_verses(
  version_code,
  book_code,
  chapter,
  verse_start,
  verse_end
);

CREATE INDEX idx_bible_book_position
ON bible_version_books(
  version_code,
  position
);