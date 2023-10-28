import { Game, } from './common'
import { twitch } from './twitch'
import { renderSidebarItems } from './sidebar';
import { atom } from 'nanostores'

export const feedback_elem = document.querySelector(".search-feedback")!;
export const search_list = document.querySelector(".js-search-list")!;
export const search_scrollbox = search_list.parentElement!;
export const search_item_tmpl = (search_list.nextElementSibling! as HTMLTemplateElement).content.firstElementChild!;
export let search_items: Game[] = [];

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
        search_items = results as Game[];
        renderSidebarItems("search");
    }, 400);
})
