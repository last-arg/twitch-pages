import {act} from '@artalar/act';
import { config } from 'config';
import { twitchCatImageSrc } from './common';

type Game = {
    name: string,
    id: string,
    box_art_url: string,
}

const data: Game[] = JSON.parse(localStorage.getItem("games") ?? "[]");
export const games = act(data);
const games_list = document.querySelector(".js-games-list")!;
const tmpl_li = (games_list?.nextElementSibling! as HTMLTemplateElement).content.firstElementChild!;

// TODO: dom manipulation should happen when:
// 1) games' sidebar is open
// 2) games' sidebar is closed but was clicked on
// TODO: improve updating DOM 
const unsub = games.subscribe((value) => {
    console.log("games", games())
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
        const external_link = new_item.querySelector("[href='#external_link']")! as HTMLLinkElement;
        external_link.href = "https://www.twitch.tv/directory/game/" + game.name;
        frag.append(new_item);
    }
    games_list.replaceChildren(frag);
    localStorage.setItem("games", JSON.stringify(value))
})

const addGame = (game: Game) => {
    const arr = [...games(), game];
    arr.sort((a, b) => {
        const a_name = a.name.toLowerCase();
        const b_name = b.name.toLowerCase();
        if (a_name < b_name) {
            return -1;
        } else if (a_name > b_name) {
            return 1;
        }
        return 0;
    });
    games(arr);
};

const removeGame = (id: string) => {
    const arr = games();
    const index = arr.findIndex((game) => game.id === id);
    if (index === -1) {
        return;
    }
    arr.splice(index, 1)
    games([...arr]);
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
        }
    }
})

