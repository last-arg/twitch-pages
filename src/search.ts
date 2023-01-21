import {act} from '@artalar/act';
import { Twitch } from './twitch';
import { SEARCH_COUNT } from './common'

type Search = {
    name: string,
    id: string,
}

const search_term = act("");

let search_timeout = 0;
const feedback_elem = document.querySelector(".search-feedback")!;
const search_results = act(() => {
    clearTimeout(search_timeout);
    const term = search_term().trim();
    console.log("compt serach", term);
    if (term.length > 0) {
        feedback_elem.textContent = "Searching...";
        console.log("searchin...", term);
        search_timeout = window.setTimeout(async () => {
            console.log("make search request");
            const results = await fetchSearch(search_term());
            if (results.length === 0) {
                feedback_elem.textContent = "Found no games";
                return;
            }
            feedback_elem.textContent = "";
            console.log(results)
            // TODO: render games
        }, 400);
    } else {
        feedback_elem.textContent = "Enter game name to search";
    }
});

document.querySelector("#game_name")?.addEventListener("input", (e: Event) => {
    search_term((e.target as HTMLInputElement).value);
    search_results();
})

  // Alpine.effect(() => {
  //   clearTimeout(searchTimeout)
  //   const searchTerm = this.searchValue.trim()
  //   if (searchTerm.length > 0) {
  //     this.loading = true;
  //     searchTimeout = setTimeout(async () => {
  //       let aria_msg = "Searching games"
  //       this.searchResults = await this.fetchSearch(searchTerm)
  //       this.loading = false;
  //       if (this.searchResults.length === 1) {
  //         aria_msg = "Found one game"
  //       } else if (this.searchResults.length > 1) {
  //         aria_msg = `Found ${this.searchResults.length} games`
  //       } else {
  //         aria_msg = "Found no games"
  //       }
  //       if (this.state !== "closed") {
  //         const scroll_position = menuItemToScrollPosition(sidebarButtons[this.state]);
  //         if (scroll_position) {
  //           window.requestAnimationFrame(function() {
  //             const scrollbox = scroll_position.querySelector(".scrollbox")!;
  //             sidebarShadows(scrollbox as HTMLElement);
  //           });
  //         }
  //       }
  //       setAriaMsg(aria_msg)
  //     }, 400)
  //   } else {
  //     this.searchResults = [];
  //   }
  // })



async function fetchSearch(input: string): Promise<Search[]> {
    const url = `https://api.twitch.tv/helix/search/categories?first=${SEARCH_COUNT}&query=${input}`;
    const r = await fetch(url, { method: "GET", headers: Twitch.headers })
    const results = await r.json()
    return results.data ?? []
}

