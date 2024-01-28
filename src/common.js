import { Games, SearchGames } from "./games";
import { LiveStreams, LiveStreamsStore, Streams, StreamsStore, UserImages } from "./streams";
import { Sidebar } from "./sidebar";

export const state = {
    /** @type {string | null} */
    path: document.location.pathname,   
    /** @param {string | null} path */
    setPath(path) {
        this.path = path;
    }
}

const live_store = new LiveStreamsStore();
const streams_store = new StreamsStore(live_store);
export const user_images = new UserImages(streams_store);

export const games = new Games();
// NOTE: StreamsStore also contains LiveStreamsStore
export const live = new LiveStreams(streams_store);
export const streams = new Streams(streams_store, live, user_images);

export const game_search = new SearchGames(games);
export const sidebar = new Sidebar();

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

class FormFilter extends HTMLElement {
    constructor() {
        super();
        const _this = this;
        this.$ = {
            form: /** @type {HTMLFormElement} */ (this.querySelector(".search-form")),
            /**
              @param {Event} e
            */
            handleSubmit(e) { e.preventDefault(); },
            resetFilter() {
                _this.css_sheet.deleteRule(0)
            },
            /** @param {Event} evt */
            handleInput(evt) {
                if (_this.css_sheet.cssRules.length > 0) {
                    _this.css_sheet.deleteRule(0)
                }
                // @ts-ignore
                const value = /** @type {string} */ (evt.target.value).trim();
                if (value.length > 0) {
                    _this.css_sheet.insertRule(`.output-list > :not(li[data-title*='${encodeURIComponent(value)}' i]) { display: none !important }`, 0);
                }
            },
        }
        const style = document.createElement('style');
        this.insertAdjacentElement('afterend', style);
        this.css_sheet = /** @type {CSSStyleSheet} */ (style.sheet);
    }

    connectedCallback() {
        this.$.form.addEventListener("input", this.$.handleInput);
        this.$.form.addEventListener("submit", this.$.handleSubmit);
        this.$.form.addEventListener("reset", this.$.resetFilter);
    }

    disconnectedCallback() {
        this.$.form.removeEventListener("input", this.$.handleInput);
        this.$.form.removeEventListener("submit", this.$.handleSubmit);
        this.$.form.removeEventListener("reset", this.$.resetFilter);
    }
}

customElements.define("form-filter", FormFilter)
