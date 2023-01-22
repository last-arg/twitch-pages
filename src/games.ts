import {act} from '@artalar/act';
import { renderGames, Game } from './common';

export const games: Game[] = JSON.parse(localStorage.getItem("games") ?? "[]");
const remove_ids = act<string[]>([]);
const add_games = act<Game[]>([]);

const games_computed = act(() => {
    return [remove_ids(), add_games()];
}, (_, next) => next[0].length > 0 && next[1].length > 0);

const games_list = document.querySelector(".js-games-list")!;
const tmpl_li = (games_list?.nextElementSibling! as HTMLTemplateElement).content.firstElementChild!;

renderGames(tmpl_li, games_list, games);

const unsub = games_computed.subscribe(([ids, adds]) => {
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

    games.sort();
    localStorage.setItem("games", JSON.stringify(games))

    const sel_start = "#main .button-follow[data-game-id=\"";
    if (adds.length > 0) {
        renderGames(tmpl_li, games_list, games);
        const selector = `${sel_start}${adds.map((game) => (game as Game).id).join("\"]," + sel_start)}"]`;
        const nodes = document.querySelectorAll(selector)
        nodes.forEach((node) => {
            node.setAttribute("data-is-followed", "true");
        });
    }

    if (ids.length > 0) {
        // remove sidbar list item(s)
        const sel_sidebar = ".js-games-list .button-follow[data-game-id=\"";
        const query_selector = `${sel_sidebar}${ids.join("\"]," + sel_sidebar)}"]`;
        const list_items = document.querySelectorAll(query_selector)
        list_items.forEach((node) => {
            node.closest("li")?.remove();
        });
        
        // Update main content follows
        const selector = `${sel_start}${ids.join("\"]," + sel_start)}"]`;
        const nodes = document.querySelectorAll(selector)
        nodes.forEach((node) => {
            node.setAttribute("data-is-followed", "false");
        });
    }
    
    add_games().length = 0;
    remove_ids().length = 0;
})

export function isFollowed(input_id: string): boolean {
    return games.some(({id}) => input_id === id);
}

const addGame = (game: Game) => {
    add_games([...add_games(), game]);
};

const removeGame = (id: string) => {
    remove_ids([...remove_ids(), id]);
};

// TODO?: move addEventListeners?
games_list.addEventListener("click", (e) => {
    const btn = (e.target as Element).closest(".button-follow");
    if (btn) {
        const id = btn.getAttribute("data-game-id")
        if (id ) {
            removeGame(id);
        }
    }
})

document.querySelector("#main")!.addEventListener("click", (e) => {
    const btn = (e.target as Element).closest(".button-follow");
    if (btn) {
        const game_raw = btn.getAttribute("data-game");
        if (game_raw) {
            const game: Game = JSON.parse(decodeURIComponent(game_raw));
            const following = (btn.getAttribute("data-is-followed") || "false") === "true";
            if (following) {
                removeGame(game.id);
            } else {
                addGame(game);
            }
            btn.setAttribute("data-is-followed", (!following).toString())
            return;
        }

        const id = btn.getAttribute("data-game-id")
        if (id ) {
            removeGame(id);
        }
    }
})
