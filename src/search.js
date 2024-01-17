import { twitch } from './twitch'
import { renderSidebarItems } from './sidebar';
import { atom } from 'nanostores'

/**
 * @typedef {import("./common").Game} Game
 */

export const feedback_elem = /** @type {Element} */ (document.querySelector(".search-feedback"));
export const search_list = /** @type {Element} */ (document.querySelector(".js-search-list"));
export const search_scrollbox = /** @type {HTMLElement} */ (search_list.parentElement);
// @ts-ignore
export const search_item_tmpl = search_list.nextElementSibling.content.firstElementChild;
/** @type {Game[]} */
export let search_items = [];

let search_timeout = 0;
export const search_value = atom("");
search_value.listen(function(val) {
    clearTimeout(search_timeout)
    val = val.trim();
    if (val.length === 0) {
        feedback_elem.textContent = "Enter game name to search";
        search_list.innerHTML = "";
        return;
    }

    feedback_elem.textContent = "Searching...";
    search_timeout = window.setTimeout(async function() {
        const results = await twitch.fetchSearch(val);
        if (results.length === 0) {
            feedback_elem.textContent = "Found no games";
            search_list.innerHTML = "";
            return;
        }
        feedback_elem.textContent = "";
        search_items = /** @type {Game[]} */ (results);
        renderSidebarItems("search");
    }, 400);
})
