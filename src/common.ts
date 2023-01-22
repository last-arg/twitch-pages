import { config } from "config";
import { isFollowed } from "./games";

export const TWITCH_MAX_QUERY_COUNT = 100
export const TWITCH_CLIENT_ID = "7v5r973dmjp0nd1g43b8hcocj2airz";
export const SEARCH_COUNT = 10
export const API_URL = "https://api.twitch.tv"

export type VideoType = "archive" | "upload" | "highlight"

export type Game = {
    name: string,
    id: string,
    box_art_url: string,
}

export function twitchCatImageSrc(url_template: string, width: number, height: number): string {
  return url_template.replace("{width}", width.toString()).replace("{height}", height.toString());
}

// TODO: dom manipulation should happen when:
// 1) games' sidebar is open
// 2) games' sidebar is closed but was clicked on
// TODO: improve updating DOM 
// Update main content follows
export function renderGames(base_elem: Element, target:Element, data: Game[]) {
    const frag = document.createDocumentFragment();
    for (const game of data) {
        const new_item = base_elem.cloneNode(true) as Element;
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
        btn.setAttribute("data-is-followed", isFollowed(game.id).toString())
        let escaped_name = game.name.replace(/(['"])/g, '\\$1');
        const encoded_game = encodeURIComponent(`{"name": "${escaped_name}", "id": "${game.id}", "box_art_url": "${game.box_art_url}"}`);
        btn.setAttribute("data-game", encoded_game);
        const span = btn.querySelector("span")!;
        span.textContent = "Unfollow";
        const external_link = new_item.querySelector("[href='#external_link']")! as HTMLLinkElement;
        external_link.href = "https://www.twitch.tv/directory/game/" + game.name;
        frag.append(new_item);
    }
    target.replaceChildren(frag);
}

