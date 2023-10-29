import { Game } from './common';
import { renderSidebarItems, sb_state } from './sidebar';
import { action } from 'nanostores'
import { persistentAtom } from '@nanostores/persistent' 

export const games_list = document.querySelector(".js-games-list")!;
export const game_tmpl = (games_list?.firstElementChild as HTMLTemplateElement).content.firstElementChild!;
export const games_scrollbox = games_list.parentElement!;

export const followed_games = persistentAtom<Game[]>("followed_games", [], {
    encode: JSON.stringify,
    decode: JSON.parse,
});

followed_games.listen(function(_) {
    // TODO: have check items in <main> also 
    // - home page: list (game) items
    // - category page: heading
    if (sb_state.get() === "games") {
        renderSidebarItems("games");
    }
});


export const followGame = action(followed_games, 'followGame', async (store, data: Game) => {
    if (!isGameFollowed(data.id)) {
        const curr = store.get();
        curr.push(data);
        // TODO: copying is wasteful, do it better
        store.set([...curr]);
    }
});

export const unfollowGame = action(followed_games, 'unfollowGame', async (store, game_id: string) => {
    const curr = store.get();
    let i = 0
    for (; i < curr.length; i++) {
        if (curr[i].id === game_id) {
            break;
        }
    }
    if (curr.length === i) {
        return;
    }
    curr.splice(i, 1);
    // TODO: copying is wasteful, do it better
    store.set([...curr]);
});

export function isGameFollowed(input_id: string): boolean {
    return followed_games.get().some(function({id}) {return id === input_id})
}

export function clearGames() {
    followed_games.set([]);
}
