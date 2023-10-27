import {act} from '@artalar/act';
import { Game, strCompareField } from './common';
import { renderSidebarItems, sidebarShadows, sidebar_state } from './sidebar';
import { action } from 'nanostores'
import { persistentAtom } from '@nanostores/persistent' 

export const games_list = document.querySelector(".js-games-list")!;
export const game_tmpl = (games_list?.firstElementChild as HTMLTemplateElement).content.firstElementChild!;
export const games_scrollbox = games_list.parentElement!;

export const followed_games = persistentAtom<Game[]>("followed_games", [], {
    encode: JSON.stringify,
    decode: JSON.parse,
});

export const followGame = action(followed_games, 'followGame', async (store, data: Game) => {
    if (!isGameFollowed(data.id)) {
        const curr = store.get();
        curr.push(data);
        store.set(curr);
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
    store.set(curr);
});

export function isGameFollowed(input_id: string): boolean {
    return followed_games.get().some(function({id}) {return id === input_id})
}

// TODO: remove old code
export let games: Game[] = JSON.parse(localStorage.getItem("games") ?? "[]");
const remove_ids = act<string[]>([]);
const add_games = act<Game[]>([]);

const sel_start = "[data-for=\"game\"][data-item-id=\"";
add_games.subscribe((adds) => {
    if (adds.length === 0) {
        return;
    }
    for (const add of adds as Game[]) {
        if (!games.some(game => game.id === add.id)) {
            games.push(add);
        }
    }
    
    games.sort(strCompareField("name"));
    localStorage.setItem("games", JSON.stringify(games))

    if (adds.length > 0) {
        renderSidebarItems(sidebar_state());

        // This is needed because can follow/unfollow games from search sidebar
        const middle = (adds as Game[]).map(game => game.id).join("\"]," + sel_start);
        const selector = `${sel_start}${middle}"]`;
        const nodes = document.querySelectorAll(selector)
        nodes.forEach((node) => node.setAttribute("data-is-followed", "true"));
    }

    add_games().length = 0;
}); 

remove_ids.subscribe((ids) => {
    if (ids.length === 0) {
        return;
    }
    for (const id of ids) {
        const index = games.findIndex((game) => game.id === id);
        if (index === -1) {
            continue;
        }
        games.splice(index, 1)
    }
    
    localStorage.setItem("games", JSON.stringify(games))

    if (ids.length > 0) {
        // remove sidebar list item(s)
        const sel_sidebar = ".js-games-list .button-follow[data-item-id=\"";
        const query_selector = `${sel_sidebar}${ids.join("\"]," + sel_sidebar)}"]`;
        const list_items = document.querySelectorAll(query_selector)
        list_items.forEach((node) => node.closest("li")?.remove());
        
        // Update main content follows
        const selector = `${sel_start}${ids.join("\"]," + sel_start)}"]`;
        const nodes = document.querySelectorAll(selector)
        nodes.forEach((node) => node.setAttribute("data-is-followed", "false"));
        sidebarShadows(games_scrollbox);
    }
    
    remove_ids().length = 0;
});

export function addGame(game: Game) {
    add_games([...add_games(), game]);
};

export function removeGame(id: string) {
    remove_ids([...remove_ids(), id]);
};

export function clearGames() {
    games = [];
    localStorage.setItem("games", JSON.stringify(games));
}
