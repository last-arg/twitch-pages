import { settings_default } from 'config';
import { atom } from 'nanostores'
import { persistentMap } from '@nanostores/persistent';

export const current_pathname = atom(/** @type{string | null} */(document.location.pathname));

const general = {
  "top-games-count": settings_default.top_games_count,
  "category-count": settings_default.streams_count,
  "user-videos-count": settings_default.user_videos_count,
  "video-archives": 'on',
  "video-uploads": false,
  "video-highlights": false,
};

/**
@typedef {typeof general} SettingsGeneral
*/

/**
@type {{show_all: string, languages: string[]}}
*/
const category = {
  show_all: 'on',
  languages: [],
};

/**
@typedef {{general: SettingsGeneral, category: typeof category}} Settings
*/
/** @type {import("nanostores/map").MapStore<Settings>} */
export const settings = persistentMap("settings:", { general, category }, {
    encode: JSON.stringify,
    decode: JSON.parse,
});


