export type LibraryViewMode = 'grid' | 'list' | 'details';

export type LibraryViewModule = 'song' | 'audio' | 'image' | 'video' | 'document';

export type LibraryViewSettings = Record<LibraryViewModule, LibraryViewMode>;
