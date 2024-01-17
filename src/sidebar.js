import { renderGames, renderStreams } from "./common";
import { followed_games, games_list, games_scrollbox, game_tmpl } from "./games";
import { search_items, search_item_tmpl, search_list, search_scrollbox } from "./search";
import { stream_tmpl, streams_list, streams_scrollbox, followed_streams } from "./streams";
import { atom } from 'nanostores'

/** @typedef {"closed" | "games" | "streams" | "search"} SidebarState */

export const sb_state = atom(/** @type {SidebarState} */ ("closed"));

sb_state.listen(function(state) {
  sidebar_state_change(state)
});

/**
  @param {SidebarState} state
*/
export function renderSidebarItems(state) {
    if (state === "search") {
        renderGames(search_item_tmpl, search_list, search_items);
        sidebarShadows(search_scrollbox);
    } else if (state === "games") {
        renderGames(game_tmpl, games_list, followed_games.get());
        sidebarShadows(games_scrollbox);
    } else if (state === "streams") {
        renderStreams(stream_tmpl, streams_list, followed_streams.get());
        sidebarShadows(streams_scrollbox);
    }
}

export const sidebar_nav = /** @type {Element} */ (document.querySelector(".sidebar-nav"));

/**
  @param {SidebarState} state
*/
export function sidebar_state_change(state) {
    sidebar_nav.querySelector("#game_name[aria-expanded=true] , .menu-item[aria-expanded=true]")?.setAttribute("aria-expanded", "false");
    if (state !== "closed") {
        const sel = state === "search" ? "#game_name[aria-expanded=false]" : `.menu-item[data-menu-item=${state}]`;
        sidebar_nav.querySelector(sel)?.setAttribute("aria-expanded", "true");
        if (state !== "search") {
            renderSidebarItems(state);
        }
    }
}

export function initSidebarScroll() {
  const scrollContainers = document.querySelectorAll('.scroll-container');
  for (let i = 0; i < scrollContainers.length; i++) {
    const scrollbox = scrollContainers[i].querySelector('.scrollbox');
    if (!scrollbox) {
      continue;
    }
    let scrolling = false;
    scrollbox.addEventListener("scroll", (/** @type {Event} */ event) => {
      const scrollbox = /** @type {HTMLElement} */ (event.target);

      if (!scrolling) {
        window.requestAnimationFrame(function() {
          sidebarShadows(scrollbox);
          scrolling = false;
        });
        scrolling = true;
      }
    }, {passive: true});
  }
}

/**
  @param {HTMLElement} scrollbox
*/
export function sidebarShadows(scrollbox) {
    const scroll_container = scrollbox.closest('.scroll-container');
    if (scroll_container === null) {
      return;
    }
    const has_top_shadow = scrollbox.scrollTop > 0;  
    // NOTE: '- 2' is if rounding is a bit off
    const max_scroll = scrollbox.scrollHeight - scrollbox.offsetHeight - 2;
    const has_bottom_shadow = scrollbox.scrollTop < max_scroll;
    let shadow_type = undefined;
    if (has_top_shadow && has_bottom_shadow) {
      shadow_type = "both";
    } else if (has_top_shadow) {
      shadow_type = "top";
    } else if (has_bottom_shadow) {
      shadow_type = "bottom";
    }
    if (shadow_type) {
      scroll_container.setAttribute("data-scroll-shadow", shadow_type);
    } else {
      scroll_container.removeAttribute("data-scroll-shadow");
    }
}
