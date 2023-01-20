import { settings_default } from 'config';
import {act} from '@artalar/act';

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
    const raw = localStorage.getItem(storage_key);
    if (raw) {
        const new_settings = JSON.parse(raw);
        // @ts-ignore
        const s = settings[c as any];
        s(new_settings);
        s.subscribe((v) => {
            localStorage.setItem(storage_key, JSON.stringify(v));
        })
    }
}
