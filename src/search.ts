import {act} from '@artalar/act';
import { Twitch } from './twitch';
import { SEARCH_COUNT, Game } from './common'
import 'htmx.org';
import { renderSidebarItems } from './sidebar';

type Search = {
    name: string,
    id: string,
}

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
            console.log("make search request");
            const results = await fetchSearch(search_term());
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

async function fetchSearch(input: string): Promise<Search[]> {
    const url = `https://api.twitch.tv/helix/search/categories?first=${SEARCH_COUNT}&query=${input}`;
    const r = await fetch(url, { method: "GET", headers: Twitch.headers })
    const results = await r.json()
    return results.data ?? []
}

