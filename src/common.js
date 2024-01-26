import { Games, SearchGames } from "./games";
import { LiveStreams, LiveStreamsStore, Streams, UserImages } from "./streams";
import { renderSidebarItems, Sidebar } from "./sidebar";

export const state = {
    /** @type {string | null} */
    path: document.location.pathname,   
    /** @param {string | null} path */
    setPath(path) {
        this.path = path;
    }
}

export const sidebar = new Sidebar();
export const games = new Games();
export const streams = new Streams();
export const game_search = new SearchGames(games);

games.addEventListener("games:save", function() {
    renderSidebarItems("games");
});

streams.addEventListener("streams:save", function() {
    renderSidebarItems("streams");
});

const live_store = new LiveStreamsStore();
export const live = new LiveStreams(streams, live_store);
export const user_images = new UserImages(streams.items.map(({user_id}) => user_id));

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
