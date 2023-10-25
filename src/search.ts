import {act} from '@artalar/act';
import { twitch} from './main';
import { Game } from './common'
import { renderSidebarItems } from './sidebar';

export const search_term = act("");

let search_timeout = 0;
export const feedback_elem = document.querySelector(".search-feedback")!;
export const search_list = document.querySelector(".js-search-list")!;
export const search_scrollbox = search_list.parentElement!;
export const search_item_tmpl = (search_list.nextElementSibling! as HTMLTemplateElement).content.firstElementChild!;
export let search_items: Game[] = [];

export const search_results = act(() => {
    clearTimeout(search_timeout);
    const term = search_term().trim();
    if (term.length > 0) {
        feedback_elem.textContent = "Searching...";
        search_timeout = window.setTimeout(async () => {
            const results = await twitch.fetchSearch(term);
            if (results.length === 0) {
                feedback_elem.textContent = "Found no games";
                search_list.innerHTML = "";
                return;
            }
            feedback_elem.textContent = "";
            search_items = results as Game[];
            renderSidebarItems("search");
        }, 400);
    } else {
        feedback_elem.textContent = "Enter game name to search";
        search_list.innerHTML = "";
    }
});
