import { strCompareField, sidebar, categoryUrl, twitchCatImageSrc } from './common';
import { twitch } from './twitch'
import { config } from './config.prod';

/**
 * @typedef {import("./common").Game} Game
 * @typedef {import("./sidebar").ScrollContainer} ScrollContainer
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
            scroll_container: /** @type {ScrollContainer} */ (games_list.closest("scroll-container")),

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
        this._readStorage(null);
        this.render();

        // handle edits in another window
        window.addEventListener("storage", this, false);
    }

    dispatch_saved() {
        this.dispatchEvent(new CustomEvent("games:saved"));
    }

    /** @param {StorageEvent} ev */
    handleEvent(ev) {
        if (ev.type === "storage") {
            console.log("storage(Games)", ev.key);
            if (ev.key !== null && ev.key == this.localStorageKey) {
                console.log("Games: storage happened")
                this._readStorage(ev.newValue);
                this.dispatch_saved();
            }
        }
    }

    /**
        @param {string | null} new_val
    */
    _readStorage(new_val) {
        const raw = new_val || window.localStorage.getItem(this.localStorageKey);
        if (raw) {
            this.items = JSON.parse(raw);
        } else {
            this.items = [];
        }
    }

    _save() {
        window.localStorage.setItem(this.localStorageKey, JSON.stringify(this.items));
        this.dispatch_saved();
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
        this.$.scroll_container.render();
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
            input_search: /** @type {HTMLInputElement} */(form_search.querySelector("#game_name")),

            search_list: search_list,
            scroll_container: /** @type {ScrollContainer} */ (search_list.closest("scroll-container")),
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
        this.input_value = "";
        this._bindEvents();
    }

    /** @param {Event} ev */
    handleEvent(ev) {
        switch (ev.type) {
        case "submit": {
            ev.preventDefault();
            break;
        }
        case "input": {
            this.searchValue(/** @type {HTMLInputElement} */ (ev.target).value);
            break;
        }
        case "focus": {
            sidebar.setState("search")
            this.searchValue(/** @type {HTMLInputElement} */ (ev.target).value);
            break;
        }
        case "blur": {
            if (/** @type {HTMLInputElement} */ (ev.target).value.length === 0) {
                sidebar.setState("closed")
            }
            break;
        }
        }
    }

    _bindEvents() {
        this.$.form_search.addEventListener("submit", this);
        this.$.form_search.addEventListener("input", this);
        this.$.input_search.addEventListener("focus", this);
        this.$.input_search.addEventListener("blur", this);
    }

    /**
      @param {string} val
      @returns 
    */
    searchValue(val) {
        clearTimeout(this.search_timeout)
        val = val.trim();
        if (val === this.input_value) {
            return;
        } else if (val.length === 0) {
            this.$.showEnterName();
            return;
        }

        this.input_value = val;
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
                this.render();
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
        this.$.scroll_container.render();
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

