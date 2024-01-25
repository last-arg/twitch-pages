import { twitch } from './twitch'
import { renderSidebarItems, sb_state } from './sidebar';

/**
 * @typedef {import("./common").Game} Game
 */

export class Search {

    constructor() {
        const form_search = /** @type {HTMLFormElement} */ (document.querySelector("form"));
        this.$ = {
            feedback_elem: /** @type {Element} */ (document.querySelector(".search-feedback")),
            search_list: /** @type {Element} */ (document.querySelector(".js-search-list")),
            form_search: form_search,
            input_search: /** @type {Element} */(form_search.querySelector("#game_name")),

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
            }
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
            sb_state.set("search");
            this.searchValue(/** @type {HTMLInputElement} */ (e.target).value);
        });


        this.$.input_search.addEventListener("blur", (e) => {
            if (/** @type {HTMLInputElement} */ (e.target).value.length === 0) {
                sb_state.set("closed")
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
}

