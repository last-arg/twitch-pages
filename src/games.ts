import {act} from '@artalar/act';
import { Game, strCompareField } from './common';
import { renderSidebarItems, sidebarShadows, sidebar_state } from './sidebar';

export let games: Game[] = JSON.parse(localStorage.getItem("games") ?? "[]");
const remove_ids = act<string[]>([]);
const add_games = act<Game[]>([]);

export const games_list = document.querySelector(".js-games-list")!;
export const game_tmpl = (games_list?.nextElementSibling! as HTMLTemplateElement).content.firstElementChild!;
export const games_scrollbox = games_list.parentElement!;

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

export function isGameFollowed(input_id: string): boolean {
    return games.some(({id}) => input_id === id);
}

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
