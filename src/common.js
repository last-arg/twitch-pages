import { config } from "config";
import { Games } from "./games";
import { isStreamFollowed, live_users, profile_images } from "./streams";
import { renderSidebarItems } from "./sidebar";

export const games = new Games();

games.addEventListener("games:remove", function(e) {
    const id = /** @type {any} */ (e).detail.id;
    const btns = document.body.querySelectorAll(`[data-item-id='${id}']`);
    for (let i = 0; i < btns.length; i++) {
        btns[i].setAttribute("data-is-followed", "false");
    }
}); 

games.addEventListener("games:add", function(e) {
    const id = /** @type {any} */ (e).detail.id;
    const btns = document.body.querySelectorAll(`[data-item-id='${id}']`);
    for (let i = 0; i < btns.length; i++) {
        btns[i].setAttribute("data-is-followed", "true");
    }
}); 

games.addEventListener("games:save", function() {
    renderSidebarItems("games");
});

/**
@typedef {import("./streams").StreamLocal} StreamLocal
@typedef {"archive" | "upload" | "highlight"} VideoType

@typedef {Object} StreamTwitch
@property {string} user_id
@property {string} game_name
@property {string} type

@typedef {Object} Game
@property {string} name
@property {string} id
@property {string} box_art_url
*/

export const API_URL = "https://api.twitch.tv"

/**
@param {string} url_template
@param {number} width
@param {number} height
@returns {string}
*/
export function twitchCatImageSrc(url_template, width, height) {
    return url_template.replace("{width}", width.toString()).replace("{height}", height.toString());
}

/**
@param {Element} base_elem
@param {Element} target
@param {Game[]} data
*/
export function renderGames(base_elem, target, data) {
    const frag = document.createDocumentFragment();
    for (const game of data) {
        const new_item = /** @type {Element} */ (base_elem.cloneNode(true));
        new_item.id = "game-id-" + game.id;
        const p = /** @type {HTMLParagraphElement} */ (new_item.querySelector("p"));
        p.textContent = decodeURIComponent(game.name);
        const link = /** @type {Element} */ (new_item.querySelector(".link-box"));
        const href = categoryUrl(game.name); 
        link.setAttribute("href", href)
        link.setAttribute("hx-push-url", href)
        const img = /** @type {HTMLImageElement} */ (link.querySelector("img"));
        img.src = twitchCatImageSrc(game.box_art_url, config.image.category.width, config.image.category.height);
        const btn = /** @type {Element} */ (new_item.querySelector(".button-follow"));
        btn.setAttribute("data-item-id", game.id)
        btn.setAttribute("data-is-followed", games.isFollowed(game.id).toString())
        const encoded_game = encodeURIComponent(JSON.stringify(game));
        btn.setAttribute("data-item", encoded_game);
        const span = /** @type {Element} */ (btn.querySelector("span"));
        span.textContent = "Unfollow";
        const external_link = /** @type {HTMLLinkElement} */ (new_item.querySelector("[href='#external_link']"));
        external_link.href = "https://www.twitch.tv" + href;
        frag.append(new_item);
    }
    Idiomorph.morph(target, frag, {morphStyle:'innerHTML'})
}

/**
@param {Element} base_elem
@param {Element} target
@param {StreamLocal[]} data
*/
export function renderStreams(base_elem, target, data) {
    const frag = document.createDocumentFragment();
    for (const stream of data) {
        const new_item = /** @type {Element} */ (base_elem.cloneNode(true));
        new_item.id = "stream-id-" + stream.user_id;
        const p = /** @type {HTMLParagraphElement} */ (new_item.querySelector("p"));
        p.textContent = decodeURIComponent(stream.user_name);
        const link = /** @type {Element} */ (new_item.querySelector(".link-box"));
        const href = "/" + encodeURIComponent(stream.user_login) + "/videos"; 
        link.setAttribute("href", href)
        link.setAttribute("hx-push-url", href)
        const img = /** @type {HTMLImageElement} */ (link.querySelector("img"));
        const img_obj  = profile_images.get()["images"][stream.user_id];
        img.src = img_obj ? img_obj.url : "#" + stream.user_id;
        const btn = /** @type {Element} */ (new_item.querySelector(".button-follow"));
        btn.setAttribute("data-item-id", stream.user_id)
        btn.setAttribute("data-is-followed", isStreamFollowed(stream.user_id).toString())
        const encoded_game = encodeURIComponent(JSON.stringify(stream));
        btn.setAttribute("data-item", encoded_game);
        const span = /** @type {Element} */ (btn.querySelector("span"));
        span.textContent = "Unfollow";
        const external_link = /** @type {HTMLLinkElement} */ (new_item.querySelector("[href='#external_link']"));
        external_link.href = "https://www.twitch.tv" + href;
        const lu = live_users.get();
        const card = /** @type {Element} */ (new_item.querySelector(".js-card-live"));
        card.setAttribute("data-stream-id", stream.user_id);
        if (lu[stream.user_id]) {
            card.classList.remove("hidden");
            const card_p = /** @type {HTMLParagraphElement} */ (card.querySelector("p"));
            card_p.textContent = lu[stream.user_id] || "";
        } else {
            card.classList.add("hidden");
        }
        frag.append(new_item);
    }
    Idiomorph.morph(target, frag, {morphStyle:'innerHTML'})
}

/**
@param {string} name
@returns {(a: any, b: any) => number}
*/
export function strCompareField(name) {
    return (a, b) => {
        return a[name].localeCompare(b[name], undefined, {sensitivity: "base"});
    }
}

/**
@param {string} cat
@param {boolean} is_twitch
@return {string}
*/
export function categoryUrl(cat, is_twitch = false) {
    let result = "";
    if (is_twitch) {
        result += "https://twitch.tv"
    }
    result += "/directory/category/" + encodeURIComponent(cat);
    return result; 
}
