import {act} from '@artalar/act';
import { config } from 'config';
import { twitchCatImageSrc } from './common';

type Game = {
    name: string,
    id: string,
    box_art_url: string,
}

export const games: Game[] = JSON.parse(localStorage.getItem("games") ?? "[]");
const remove_ids = act<string[]>([]);
const add_games = act<Game[]>([]);

const games_computed = act(() => {
    return [remove_ids(), add_games()];
}, (_, next) => next[0].length > 0 && next[1].length > 0);

const games_list = document.querySelector(".js-games-list")!;
const tmpl_li = (games_list?.nextElementSibling! as HTMLTemplateElement).content.firstElementChild!;

renderGames(games);

const unsub = games_computed.subscribe(([ids, adds]) => {
    console.log("sub", ids, adds)
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
        renderGames(games);
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

const addGame = (game: Game) => {
    add_games([...add_games(), game]);
};

const removeGame = (id: string) => {
    remove_ids([...remove_ids(), id]);
};

// TODO: dom manipulation should happen when:
// 1) games' sidebar is open
// 2) games' sidebar is closed but was clicked on
// TODO: improve updating DOM 
// Update main content follows
function renderGames(data: Game[]) {
    const frag = document.createDocumentFragment();
    for (const game of data) {
        const new_item = tmpl_li.cloneNode(true) as Element;
        const p = new_item.querySelector("p")!;
        p.textContent = decodeURIComponent(game.name);
        const link = new_item.querySelector(".link-box")!;
        const href = "/directory/games/" + game.name; 
        link.setAttribute("href", href)
        link.setAttribute("hx-push-url", href)
        const img = link.querySelector("img")!;
        img.src = twitchCatImageSrc(game.box_art_url, config.image.category.width, config.image.category.height);
        const btn = new_item.querySelector(".button-follow")!;
        btn.setAttribute("data-game-id", game.id)
        btn.setAttribute("data-is-followed", "true")
        const span = btn.querySelector("span")!;
        span.textContent = "Unfollow";
        const external_link = new_item.querySelector("[href='#external_link']")! as HTMLLinkElement;
        external_link.href = "https://www.twitch.tv/directory/game/" + game.name;
        frag.append(new_item);
    }
    games_list.replaceChildren(frag);
}

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
            console.log(btn.getAttribute("data-is-followed"))
            const following = (btn.getAttribute("data-is-followed") || "false") === "true";
            if (following) {
                console.log("remove", game.id)
                removeGame(game.id);
            } else {
                console.log("add", game)
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
