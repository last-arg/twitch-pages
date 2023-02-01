import { config } from "config";
import { isGameFollowed } from "./games";
import { add_profiles, live_streams_local, profiles, StreamLocal } from "./streams";

export const TWITCH_MAX_QUERY_COUNT = 100
export const TWITCH_CLIENT_ID = "7v5r973dmjp0nd1g43b8hcocj2airz";
export const SEARCH_COUNT = 10
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
        const href = "/directory/game/" + encodeURIComponent(game.name); 
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

export function renderStreams(tmpl: Element, target:Element, data: StreamLocal[]) {
    const live_streams = live_streams_local();
    const frag = document.createDocumentFragment();
    let img_urls = [];
    for (const stream of data) {
        const new_item = tmpl.cloneNode(true) as Element;

        const link = new_item.querySelector(".link-box")!;
        const href = `/${stream.user_login}/videos`; 
        link.setAttribute("href", href)
        link.setAttribute("hx-push-url", href)

        const img = link.querySelector("img")!;
        let img_src = profiles[stream.user_id]?.url;
        if (!img_src) {
            img_src = `#${stream.user_id}`;
            img_urls.push(stream.user_id);
        }
        img.src = img_src;
        
        const p = new_item.querySelector(".card-title")!;
        p.textContent = stream.user_name;

        const btn = new_item.querySelector(".button-follow")!;
        // Always true because streams is render only in one place
        btn.setAttribute("data-is-followed", "true")
        const encoded_game = encodeURIComponent(JSON.stringify(stream));
        btn.setAttribute("data-item", encoded_game);
        btn.setAttribute("data-item-id", stream.user_id);
        const span = btn.querySelector("span")!;
        span.textContent = "Unfollow";
        const external_link = new_item.querySelector("[href='#external_link']")! as HTMLLinkElement;
        external_link.href = "https://www.twitch.tv/" + stream.user_login + "/";
        const stream_live = link.querySelector(".card-live")!;
        stream_live.setAttribute("data-stream-id", stream.user_id);

        const game = live_streams[stream.user_id]
        if (game) {
            stream_live.classList.remove("hidden");
            stream_live.querySelector("p")!.textContent = game;
        }
        
        frag.append(new_item);
        
    }
    target.replaceChildren(frag);
    add_profiles(img_urls);
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
