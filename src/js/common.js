import { Games, SearchGames } from "./games";
import { LiveStreams, LiveStreamsStore, Streams, StreamsStore, UserImages } from "./streams";
import { Sidebar } from "./sidebar";

/** @type {Games} */
export var games;
// NOTE: StreamsStore also contains LiveStreamsStore
/** @type {LiveStreams} */
export var live;
/** @type {Streams} */
export var streams;

/** @type {Sidebar} */
export var sidebar;

export function init_common() {
    const live_store = new LiveStreamsStore();
    const streams_store = new StreamsStore(live_store);
    const user_images = new UserImages(streams_store);

    games = new Games();
    live = new LiveStreams(streams_store);
    streams = new Streams(streams_store, live, user_images);

    new SearchGames(games);
    sidebar = new Sidebar();

    games.addEventListener("games:saved", function() {
        games.render();
        // render page /category/<name> game stars
        // render page / (root) game stars
        // render search sidebar game stars
        for (const button_follow of document.querySelectorAll(".button-follow[data-for=game]")) {
            const game_id = /** @type {string | undefined} */ (button_follow.dataset.itemId);
            if (game_id === undefined) {
                console.warn(`Could not find 'data-item-id' attribute in`, button_follow);
                continue;
            }
            const is_followed_raw = /** @type {string | undefined} */ (button_follow.dataset.isFollowed);
            if (is_followed_raw === undefined) {
                console.warn(`Could not find 'data-is-followed' attribute in`, button_follow);
                continue;
            }
            const is_followed = is_followed_raw === "true";
            const has_game = games.items.some((val) => val.id === game_id );
            if (is_followed !== has_game) {
                button_follow.dataset.isFollowed = has_game.toString();
            }
        }
    });

    streams_store.addEventListener("streams_store:save", render_streams);
    live_store.addEventListener("live_streams:save", render_streams);

    function render_streams() {
        console.log("render")
        streams.render();

        // render /<user>/videos user follow stars
        // render page /category/<name> user follow stars
        for (const button_follow of document.querySelectorAll(".button-follow[data-for=stream]")) {
            const user_id = /** @type {string | undefined} */ (button_follow.dataset.itemId);
            if (user_id === undefined) {
                console.warn(`Could not find 'data-item-id' attribute in`, button_follow);
                continue;
            }
            const is_followed_raw = /** @type {string | undefined} */ (button_follow.dataset.isFollowed);
            if (is_followed_raw === undefined) {
                console.warn(`Could not find 'data-is-followed' attribute in`, button_follow);
                continue;
            }
            const is_followed = is_followed_raw === "true";
            const has_stream = streams_store.items.some((val) => val.user_id === user_id );
            if (is_followed !== has_stream) {
                button_follow.dataset.isFollowed = has_stream.toString();
            }
        }
    }
}

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

class FormFilter extends HTMLElement {
    constructor() {
        super();
        this.$ = {
            form: /** @type {HTMLFormElement} */ (this.querySelector(".search-form")),
        }
        const style = document.createElement('style');
        this.insertAdjacentElement('afterend', style);
        this.css_sheet = /** @type {CSSStyleSheet} */ (style.sheet);
    }

    /** @param {Event} ev */
    handleEvent(ev) {
        switch (ev.type) {
        case "submit": {
            ev.preventDefault();
            break;
        }
        case "reset": {
            this.css_sheet.deleteRule(0)
            break;
        }
        case "input": {
            if (this.css_sheet.cssRules.length > 0) {
                this.css_sheet.deleteRule(0)
            }
            // @ts-ignore
            const value = /** @type {string} */ (ev.target.value).trim();
            if (value.length > 0) {
                this.css_sheet.insertRule(`.output-list > :not(li[data-title*='${encodeURIComponent(value)}' i]) { display: none !important }`, 0);
            }
            break;
        }
        }
    }

    connectedCallback() {
        this.$.form.addEventListener("input", this);
        this.$.form.addEventListener("submit", this);
        this.$.form.addEventListener("reset", this);
    }

    disconnectedCallback() {
        this.$.form.removeEventListener("input", this);
        this.$.form.removeEventListener("submit", this);
        this.$.form.removeEventListener("reset", this);
    }
}

customElements.define("form-filter", FormFilter)
