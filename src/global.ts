import { settings_default } from 'config';
import { atom } from 'nanostores'
import { persistentMap } from '@nanostores/persistent';

export const current_pathname = atom<string | null>(document.location.pathname);

const general = {
  "top-games-count": settings_default.top_games_count,
  "category-count": settings_default.streams_count,
  "user-videos-count": settings_default.user_videos_count,
  "video-archives": 'on',
  "video-uploads": false,
  "video-highlights": false,
};

export type SettingsGeneral = typeof general;

const category = {
  show_all: 'on',
  languages: [] as string[],
};

type Settings = {general: SettingsGeneral, category: typeof category};
export const settings = persistentMap<Settings>("settings:", { general, category }, {
    encode: JSON.stringify,
    decode: JSON.parse,
});


