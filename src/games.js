import { strCompareField, sidebar, categoryUrl, twitchCatImageSrc } from './common';
import { twitch } from './twitch'
import { renderSidebarItems } from './sidebar';
import { config } from 'config';

/**
 * @typedef {import("./common").Game} Game
 */

export class Games extends EventTarget {
    /** @type {Game[]} */
    items = [];

    constructor() {
        super();
        const games_list = /** @type {Element} */ (document.querySelector(".js-games-list"));
        this.$ = {
            games_list: games_list,
            // @ts-ignore
            game_tmpl: /** @type {Element} */ (games_list?.firstElementChild.content.firstElementChild),
            games_scrollbox: /** @type {HTMLElement} */ (games_list.parentElement),

            /** @param {string} id */
            removeGame(id) {
                const btns = document.body.querySelectorAll(`[data-item-id='${id}']`);
                for (let i = 0; i < btns.length; i++) {
                    btns[i].setAttribute("data-is-followed", "false");
                }
            },

            /** @param {string} id */
            addGame(id) {
                const btns = document.body.querySelectorAll(`[data-item-id='${id}']`);
                for (let i = 0; i < btns.length; i++) {
                    btns[i].setAttribute("data-is-followed", "true");
                }
            },
        }
        this.localStorageKey = "followed_games"
        this._readStorage();

        // handle edits in another window
        window.addEventListener("storage", () => {
            this._readStorage();
            this._save();
        }, false);
    }

    _readStorage() {
        this.items = JSON.parse(window.localStorage.getItem(this.localStorageKey) || "[]");
    }

    _save() {
        window.localStorage.setItem(this.localStorageKey, JSON.stringify(this.items));
        this.dispatchEvent(new CustomEvent('games:save'));
    }

    clear() {
        this.items = [];
        this._save();
    }

    /**
        @param {string} input_id
        @returns {boolean}
    */
    isFollowed(input_id) {
        return this.items.some(function({id}) {return id === input_id})
    }

    /**
        @param {string} game_id
    */
    unfollow(game_id) {
        const curr = this.items;
        let i = 0
        for (; i < curr.length; i++) {
            if (curr[i].id === game_id) {
                break;
            }
        }

        if (i >= curr.length) { return; }

        const remove_game = curr.splice(i, 1)[0].id
        this.$.removeGame(remove_game)
        this._save();
    }

    /**
        @param {Game} game
    */
    follow(game) {
        if (this.isFollowed(game.id)) { return; }

        this.items.push(game);
        this.items.sort(strCompareField("name"))

        this.$.removeGame(game.id)
        this._save();
    }

    render() {
        const frag = renderGameCards(this.$.game_tmpl, this.items, (id) => this.isFollowed(id));
        Idiomorph.morph(this.$.games_list, frag, {morphStyle:'innerHTML'})
    }
    
}

export class SearchGames {
    /**
      @param {Games} games
    */
    constructor(games) {
        this.games = games
        const form_search = /** @type {HTMLFormElement} */ (document.querySelector("form"));
        const search_list = /** @type {Element} */ (document.querySelector(".js-search-list"));
        this.$ = {
            feedback_elem: /** @type {Element} */ (document.querySelector(".search-feedback")),
            form_search: form_search,
            input_search: /** @type {Element} */(form_search.querySelector("#game_name")),

            search_list: search_list,
            search_scrollbox: /** @type {HTMLElement} */ (search_list.parentElement),
            // @ts-ignore
            search_item_tmpl: search_list.nextElementSibling.content.firstElementChild,

            clearFeedback() {
                this.feedback_elem.textContent = "";
            },
            showEnterName() {
                this.feedback_elem.textContent = "Enter game name to search";
                this.search_list.innerHTML = "";
            },
            showNoGames() {
                this.feedback_elem.textContent = "Found no games";
                this.search_list.innerHTML = "";
            },
            showSearching() {
                this.feedback_elem.textContent = "Searching...";
            },
        }

        /** @type {Game[]} */
        this.items = [];
        this.search_timeout = 0;
        this._bindEvents();
    }

    _bindEvents() {
        this.$.form_search.addEventListener("input", (e) => {
            e.preventDefault();
            this.searchValue(/** @type {HTMLInputElement} */ (e.target).value);
        });

        this.$.input_search.addEventListener("focus", (e) => {
            sidebar.setState("search")
            this.searchValue(/** @type {HTMLInputElement} */ (e.target).value);
        });


        this.$.input_search.addEventListener("blur", (e) => {
            if (/** @type {HTMLInputElement} */ (e.target).value.length === 0) {
                sidebar.setState("closed")
            }
        });
    }

    /**
      @param {string} val
      @returns 
    */
    searchValue(val) {
        clearTimeout(this.search_timeout)
        val = val.trim();
        if (val.length === 0) {
            this.$.showEnterName();
            return;
        }

        this.$.showSearching();
        this.search_timeout = window.setTimeout(async () => {
            const results = /** @type {Game[]} */ (await twitch.fetchSearch(val));
            if (results.length === 0) {
                this.$.showNoGames();
                return;
            }
            this.$.clearFeedback();
            if (!this.isSameItems(results)) {
                this.items = results;
                renderSidebarItems("search");
            }
        }, 400);
    }

    /**
      @param {Game[]} new_arr
      @returns boolean
    */
    isSameItems(new_arr) {
        const old_arr = this.items;
        if (old_arr.length === new_arr.length) {
            for (let i = 0; i < old_arr.length; i++) {
                const old = old_arr[i];
                const item = new_arr[i];
                if (old.id !== item.id) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }

    render() {
        const frag = renderGameCards(this.$.search_item_tmpl, this.items, (id) => this.games.isFollowed(id));
        Idiomorph.morph(this.$.search_list, frag, {morphStyle:'innerHTML'})
    }
}

/**
@param {Element} base_elem
@param {Game[]} data
@param {((id: string) => boolean) | undefined} isGameFollowed
*/
function renderGameCards(base_elem, data, isGameFollowed = undefined) {
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
        if (isGameFollowed) {
            btn.setAttribute("data-is-followed", isGameFollowed(game.id).toString())
        }
        const encoded_game = encodeURIComponent(JSON.stringify(game));
        btn.setAttribute("data-item", encoded_game);
        const span = /** @type {Element} */ (btn.querySelector("span"));
        span.textContent = "Unfollow";
        const external_link = /** @type {HTMLLinkElement} */ (new_item.querySelector("[href='#external_link']"));
        external_link.href = "https://www.twitch.tv" + href;
        frag.append(new_item);
    }
    return frag;
}

