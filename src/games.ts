import {act} from '@artalar/act';
import { config } from 'config';
import { twitchCatImageSrc } from './common';

type Game = {
    name: string,
    id: string,
    box_art_url: string,
}

const data: Game[] = JSON.parse(localStorage.getItem("games") ?? "[]");
const games = act(data);
const games_list = document.querySelector(".js-games-list")!;
const tmpl_li = (games_list?.nextElementSibling! as HTMLTemplateElement).content.firstElementChild!;

// TODO: dom manipulation should happen when:
// 1) games' sidebar is open
// 2) games' sidebar is closed but was clicked on
// TODO: improve updating DOM 
const unsub = games.subscribe((value) => {
    const frag = document.createDocumentFragment();
    for (const game of value) {
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
        frag.append(new_item);
    }
    games_list.replaceChildren(frag);
    localStorage.setItem("games", JSON.stringify(value))
})

const addGame = (game: Game) => {
    games([...games(), game].sort());
};

const removeGame = (id: string) => {
    const index = games().findIndex((game) => game.id === id);
    if (index === -1) {
        return;
    }
    games().splice(index, 1)
    games([...games()]);
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
        const id = btn.getAttribute("data-game-id")
        if (id ) {
            removeGame(id);
            return;
        }
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
        }
    }
})

