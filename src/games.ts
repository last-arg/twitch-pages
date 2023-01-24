import {act} from '@artalar/act';
import { renderGames, Game, strCompareField } from './common';
import 'htmx.org';

export const games: Game[] = JSON.parse(localStorage.getItem("games") ?? "[]");
const remove_ids = act<string[]>([]);
const add_games = act<Game[]>([]);

const games_computed = act(() => {
    return [remove_ids(), add_games()];
}, (_, next) => next[0].length > 0 && next[1].length > 0);

export const games_list = document.querySelector(".js-games-list")!;
export const game_tmpl = (games_list?.nextElementSibling! as HTMLTemplateElement).content.firstElementChild!;

games_computed.subscribe(([ids, adds]) => {
    if (adds.length === 0 && ids.length === 0) {
        return;
    }
    for (const add of adds as Game[]) {
        if (!games.some(game => game.id === add.id)) {
            games.push(add);
        }
    }

    for (const id of ids) {
        const index = games.findIndex((game) => game.id === id);
        if (index === -1) {
            continue;
        }
        games.splice(index, 1)
    }

    games.sort(strCompareField("name"));
    localStorage.setItem("games", JSON.stringify(games))

    const sel_start = "[data-for=\"game\"][data-item-id=\"";
    if (adds.length > 0) {
        renderGames(game_tmpl, games_list, games);
        htmx.process(games_list as HTMLElement);

        const middle = (adds as Game[]).map(game => game.id).join("\"]," + sel_start);
        const selector = `${sel_start}${middle}"]`;
        const nodes = document.querySelectorAll(selector)
        nodes.forEach((node) => node.setAttribute("data-is-followed", "true"));
    }

    if (ids.length > 0) {
        // remove sidbar list item(s)
        const sel_sidebar = ".js-games-list .button-follow[data-item-id=\"";
        const query_selector = `${sel_sidebar}${ids.join("\"]," + sel_sidebar)}"]`;
        const list_items = document.querySelectorAll(query_selector)
        list_items.forEach((node) => node.closest("li")?.remove());
        
        // Update main content follows
        const selector = `${sel_start}${ids.join("\"]," + sel_start)}"]`;
        const nodes = document.querySelectorAll(selector)
        nodes.forEach((node) => node.setAttribute("data-is-followed", "false"));
    }
    
    add_games().length = 0;
    remove_ids().length = 0;
})

export function isGameFollowed(input_id: string): boolean {
    return games.some(({id}) => input_id === id);
}

export function addGame(game: Game) {
    add_games([...add_games(), game]);
};

export function removeGame(id: string) {
    remove_ids([...remove_ids(), id]);
};
