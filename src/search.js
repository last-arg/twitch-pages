import { twitch } from './twitch'
import { renderSidebarItems } from './sidebar';

/**
 * @typedef {import("./common").Game} Game
 */

 // TODO: maybe move search_scrollbox and search_item_tmpl - not used here
export const search_list = /** @type {Element} */ (document.querySelector(".js-search-list"));
export const search_scrollbox = /** @type {HTMLElement} */ (search_list.parentElement);
// @ts-ignore
export const search_item_tmpl = search_list.nextElementSibling.content.firstElementChild;

export class Search {
    static feedback_elem = /** @type {Element} */ (document.querySelector(".search-feedback"));
    static search_list = /** @type {Element} */ (document.querySelector(".js-search-list"));
    static search_scrollbox = /** @type {HTMLElement} */ (this.search_list.parentElement);
    // @ts-ignore
    static search_item_tmpl = this.search_list.nextElementSibling.content.firstElementChild;

    constructor() {
        /** @type {Game[]} */
        this.items = [];
        this.search_timeout = 0;
    }

    /**
      @param {string} val
      @returns 
    */
    searchValue(val) {
        clearTimeout(this.search_timeout)
        val = val.trim();
        if (val.length === 0) {
            Search.feedback_elem.textContent = "Enter game name to search";
            Search.search_list.innerHTML = "";
            return;
        }

        Search.feedback_elem.textContent = "Searching...";
        this.search_timeout = window.setTimeout(async () => {
            const results = /** @type {Game[]} */ (await twitch.fetchSearch(val));
            if (results.length === 0) {
                Search.feedback_elem.textContent = "Found no games";
                Search.search_list.innerHTML = "";
                return;
            }
            Search.feedback_elem.textContent = "";
            if (!isSameArray(this.items, results)) {
                this.items = results;
                renderSidebarItems("search");
            }
        }, 400);
    }
}

/**
  @param {Game[]} old_arr
  @param {Game[]} new_arr
  @returns boolean
*/
function isSameArray(old_arr, new_arr) {
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
