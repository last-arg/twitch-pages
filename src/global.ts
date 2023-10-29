import { settings_default } from 'config';
import {act} from '@artalar/act';
import { atom } from 'nanostores'
// import { persistentAtom, persistentMap } from '@nanostores/persistent' 

export const current_pathname = atom<string | null>(document.location.pathname);

export const settings = {
    general: act({
      "top-games-count": settings_default.top_games_count,
      "category-count": settings_default.streams_count,
      "user-videos-count": settings_default.user_videos_count,
      "video-archives": 'on',
      "video-uploads": false,
      "video-highlights": false,
    }),
    category: act({
      show_all: 'on',
      languages: [] as string[],
    }),
};

for (const c in settings) {
    const storage_key = `settings.${c}`;
    // @ts-ignore
    const s = settings[c as any];
    const raw = localStorage.getItem(storage_key);
    if (raw) {
        s(JSON.parse(raw));
    }
    s.subscribe((v: ReturnType<typeof settings.general>) => {
        localStorage.setItem(storage_key, JSON.stringify(v));
    })
}


