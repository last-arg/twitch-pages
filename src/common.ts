import { config } from "config";
import { isGameFollowed } from "./games";
import { isStreamFollowed, live_users, profile_images, StreamLocal } from "./streams";

export const API_URL = "https://api.twitch.tv"

export type VideoType = "archive" | "upload" | "highlight"

export type StreamTwitch = {
  user_id: string,
  game_name: string,
  type: string,
}

export type Game = {
    name: string,
    id: string,
    box_art_url: string,
}


export function twitchCatImageSrc(url_template: string, width: number, height: number): string {
  return url_template.replace("{width}", width.toString()).replace("{height}", height.toString());
}

// TODO: improve updating DOM 
// Update main content follows
export function renderGames(base_elem: Element, target:Element, data: Game[]) {
    const frag = document.createDocumentFragment();
    for (const game of data) {
        const new_item = base_elem.cloneNode(true) as Element;
        const p = new_item.querySelector("p")!;
        p.textContent = decodeURIComponent(game.name);
        const link = new_item.querySelector(".link-box")!;
        const href = "/directory/games/" + encodeURIComponent(game.name); 
        link.setAttribute("href", href)
        link.setAttribute("hx-push-url", href)
        const img = link.querySelector("img")!;
        img.src = twitchCatImageSrc(game.box_art_url, config.image.category.width, config.image.category.height);
        const btn = new_item.querySelector(".button-follow")!;
        btn.setAttribute("data-item-id", game.id)
        btn.setAttribute("data-is-followed", isGameFollowed(game.id).toString())
        const encoded_game = encodeURIComponent(JSON.stringify(game));
        btn.setAttribute("data-item", encoded_game);
        const span = btn.querySelector("span")!;
        span.textContent = "Unfollow";
        const external_link = new_item.querySelector("[href='#external_link']")! as HTMLLinkElement;
        external_link.href = "https://www.twitch.tv" + href;
        frag.append(new_item);
    }
    target.replaceChildren(frag);
}

// TODO: improve updating DOM 
// Update main content follows
export function renderStreams(base_elem: Element, target:Element, data: StreamLocal[]) {
    const frag = document.createDocumentFragment();
    for (const stream of data) {
        const new_item = base_elem.cloneNode(true) as Element;
        const p = new_item.querySelector("p")!;
        p.textContent = decodeURIComponent(stream.user_name);
        const link = new_item.querySelector(".link-box")!;
        const href = "/" + encodeURIComponent(stream.user_login) + "/videos"; 
        link.setAttribute("href", href)
        link.setAttribute("hx-push-url", href)
        const img = link.querySelector("img")!;
        const img_obj  = profile_images.get()["images"][stream.user_id];
        img.src = img_obj ? img_obj.url : "#" + stream.user_id;
        const btn = new_item.querySelector(".button-follow")!;
        btn.setAttribute("data-item-id", stream.user_id)
        btn.setAttribute("data-is-followed", isStreamFollowed(stream.user_id).toString())
        const encoded_game = encodeURIComponent(JSON.stringify(stream));
        btn.setAttribute("data-item", encoded_game);
        const span = btn.querySelector("span")!;
        span.textContent = "Unfollow";
        const external_link = new_item.querySelector("[href='#external_link']")! as HTMLLinkElement;
        external_link.href = "https://www.twitch.tv" + href;
        const lu = live_users.get();
        const card = new_item.querySelector(".js-card-live")!;
        if (lu[stream.user_id]) {
            card.classList.remove("hidden");
            card.querySelector("p")!.textContent = lu[stream.user_id] || "";
        } else {
            card.classList.add("hidden");
        }
        frag.append(new_item);
    }
    target.replaceChildren(frag);
}

export function strCompareField(name: string): (a: any, b: any) => number {
    return (a, b) => {
        const nameA = a[name].toUpperCase(); // ignore upper and lowercase
        const nameB = b[name].toUpperCase(); // ignore upper and lowercase
        if (nameA < nameB) {
            return -1;
        } else if (nameA > nameB) {
            return 1;
        }

        return 0;
    }
}
