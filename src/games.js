import { strCompareField } from './common';
import { renderSidebarItems, sb_state } from './sidebar';
import { action } from 'nanostores'
import { persistentAtom } from '@nanostores/persistent' 

/**
 * @typedef {import("./common").Game} Game
 */

export const games_list = /** @type {Element} */ (document.querySelector(".js-games-list"));
// @ts-ignore
export const game_tmpl = games_list?.firstElementChild.content.firstElementChild;
export const games_scrollbox = games_list.parentElement;

/** @type {string | undefined} */
let remove_game = undefined;
/** @type {string | undefined} */
let add_game = undefined;
/** @type {import("nanostores").WritableAtom<Game[]>} */
export const followed_games = persistentAtom("followed_games", [], {
    encode: JSON.stringify,
    decode: JSON.parse,
});

followed_games.listen(function(_) {
    if (sb_state.get() === "games") {
        renderSidebarItems("games");
    }
    if (remove_game) {
        const btns = document.body.querySelectorAll(`[data-item-id='${remove_game}']`);
        for (let i = 0; i < btns.length; i++) {
            btns[i].setAttribute("data-is-followed", "false");
        }
        remove_game = undefined;
    }
    if (add_game) {
        const btns = document.body.querySelectorAll(`[data-item-id='${add_game}']`);
        for (let i = 0; i < btns.length; i++) {
            btns[i].setAttribute("data-is-followed", "true");
        }
        add_game = undefined;
    }
});


export const followGame = action(followed_games, 'followGame', async function(store, /** @type {Game} */ game) {
    if (!isGameFollowed(game.id)) {
        const curr = store.get();
        curr.push(game);
        add_game = game.id;
        // TODO: copying is wasteful, do it better
        store.set([...curr].sort(strCompareField("name")));
    }
});

export const unfollowGame = action(followed_games, 'unfollowGame', async (store, /** @type {string} */ game_id) => {
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

/**
    @param {string} input_id
    @returns {boolean}
*/
export function isGameFollowed(input_id) {
    return followed_games.get().some(function({id}) {return id === input_id})
}

export function clearGames() {
    followed_games.set([]);
}
