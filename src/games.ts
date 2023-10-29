import { Game, strCompareField } from './common';
import { renderSidebarItems, sb_state } from './sidebar';
import { action } from 'nanostores'
import { persistentAtom } from '@nanostores/persistent' 

export const games_list = document.querySelector(".js-games-list")!;
export const game_tmpl = (games_list?.firstElementChild as HTMLTemplateElement).content.firstElementChild!;
export const games_scrollbox = games_list.parentElement!;

let remove_game: string | undefined = undefined;
export const followed_games = persistentAtom<Game[]>("followed_games", [], {
    encode: JSON.stringify,
    decode: JSON.parse,
});

followed_games.listen(function(_) {
    if (sb_state.get() === "games") {
        renderSidebarItems("games");
    }
    if (remove_game) {
        const btns = document.body.querySelectorAll(`[data-item-id='${remove_game}']`) as unknown as Element[];
        for (const btn of btns) {
            btn.setAttribute("data-is-followed", "false");
        }
        remove_game = undefined;
    }
    // TODO: when adding from search results
});


export const followGame = action(followed_games, 'followGame', async (store, data: Game) => {
    if (!isGameFollowed(data.id)) {
        const curr = store.get();
        curr.push(data);
        // TODO: copying is wasteful, do it better
        store.set([...curr].sort(strCompareField("name")));
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
    remove_game = curr.splice(i, 1)[0].id
    // TODO: copying is wasteful, do it better
    store.set([...curr]);
});

export function isGameFollowed(input_id: string): boolean {
    return followed_games.get().some(function({id}) {return id === input_id})
}

export function clearGames() {
    followed_games.set([]);
}
