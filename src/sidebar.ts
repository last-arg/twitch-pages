import { act } from "@artalar/act";
import { renderGames, renderStreams } from "./common";
import { games, games_list, games_scrollbox, game_tmpl } from "./games";
import { search_items, search_item_tmpl, search_list, search_scrollbox } from "./search";
import { streams, streams_list, streams_scrollbox, stream_tmpl } from "./streams";
import htmx from "htmx.org";

export type SidebarState = "closed" | "games" | "streams" | "search"
export const sidebar_state = act<SidebarState>("closed");

export function renderSidebarItems(state: SidebarState) {
    if (state === "games") {
        renderGames(game_tmpl, games_list, games);
        htmx.process(games_list as HTMLElement);
        sidebarShadows(games_scrollbox);
    } else if (state === "streams") {
        renderStreams(stream_tmpl, streams_list, streams);
        htmx.process(streams_list as HTMLElement);
        sidebarShadows(streams_scrollbox);
    } else if (state === "search") {
        renderGames(search_item_tmpl, search_list, search_items);
        htmx.process(games_list as HTMLElement);
        sidebarShadows(search_scrollbox);
    }
}

export const sidebar_nav = document.querySelector(".sidebar-nav")!;

sidebar_state.subscribe((state) => {
    sidebar_nav.querySelector("#game_name[aria-expanded=true] , .menu-item[aria-expanded=true]")?.setAttribute("aria-expanded", "false");
    if (state !== "closed") {
        const sel = state === "search" ? "#game_name[aria-expanded=false]" : `.menu-item[data-menu-item=${state}]`;
        sidebar_nav.querySelector(sel)?.setAttribute("aria-expanded", "true");
        if (state !== "search") {
            renderSidebarItems(state);
        }
    }
})

export function initSidebarScroll() {
  const scrollContainers = document.querySelectorAll('.scroll-container') as any;
  for (const scrollContainer of scrollContainers) {
    const scrollbox = scrollContainer.querySelector('.scrollbox');
    let scrolling = false;
    scrollbox.addEventListener("scroll", (event: Event) => {
      const scrollbox = event.target as HTMLElement

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

export function sidebarShadows(scrollbox: HTMLElement) {
    const scroll_container = scrollbox.closest('.scroll-container')!;
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
