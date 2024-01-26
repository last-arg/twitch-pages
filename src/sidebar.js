import { games, renderGames, renderStreams, streams } from "./common";
import { Search } from "./search";

/** @typedef {"closed" | "games" | "streams" | "search"} SidebarState */

// @ts-ignore
const htmx = /** @type {import("htmx.org")} */ (window.htmx);

const game_search = new Search();

const search_list = /** @type {Element} */ (document.querySelector(".js-search-list"));
const search_scrollbox = /** @type {HTMLElement} */ (search_list.parentElement);
// @ts-ignore
const search_item_tmpl = search_list.nextElementSibling.content.firstElementChild;

const games_list = /** @type {Element} */ (document.querySelector(".js-games-list"))
// @ts-ignore
const game_tmpl = /** @type {Element} */ (games_list?.firstElementChild.content.firstElementChild);
const games_scrollbox = /** @type {HTMLElement} */ (games_list.parentElement);

const streams_list = /** @type {Element} */ (document.querySelector(".js-streams-list"));
const tmp_elem = /** @type {HTMLTemplateElement} */ (streams_list.firstElementChild);
const stream_tmpl = /** @type {Element} */ (tmp_elem.content.firstElementChild);
const streams_scrollbox = /** @type {HTMLElement} */ (streams_list.parentElement);


export class Sidebar {
  /** @type {SidebarState} */
  state = "closed"

  constructor() {
    this.$ = {
      sidebar_nav: /** @type {Element} */ (document.querySelector(".sidebar-nav")),
      /** @param {SidebarState} state */
      showSidebar(state) {
          this.sidebar_nav.querySelector("#game_name[aria-expanded=true] , .menu-item[aria-expanded=true]")?.setAttribute("aria-expanded", "false");
          if (state !== "closed") {
              const sel = state === "search" ? "#game_name[aria-expanded=false]" : `.menu-item[data-menu-item=${state}]`;
              this.sidebar_nav.querySelector(sel)?.setAttribute("aria-expanded", "true");
              if (state !== "search") {
                  renderSidebarItems(state);
              }
          }
      },
    };

    this._bindEvents();
  }

  _bindEvents() {
      // Use event delegation to handle adding/removing items form sidebar lists
      this.$.sidebar_nav.addEventListener("click", function(e) {
        e.preventDefault();
        const link_box = /** @type {Element} */ (e.target).closest(".link-box");
        if (link_box) {
          const get = link_box.getAttribute("hx-get");
          if (!get) { return; }
          htmx.ajax("get", get, {source: link_box});
        }
      });
  }

  /** @param {SidebarState} new_state */
  setState(new_state) {
    if (this.state === new_state) {
      return;
    }
    this.state = new_state
    this.$.showSidebar(this.state);
  }
}
/**
  @param {SidebarState} state
*/
// TODO: don't re-render sidebar items every time sidebar is opened
export function renderSidebarItems(state) {
    if (state === "search") {
        renderGames(search_item_tmpl, search_list, game_search.items);
        sidebarShadows(search_scrollbox);
    } else if (state === "games") {
        renderGames(game_tmpl, games_list, games.items);
        sidebarShadows(games_scrollbox);
    } else if (state === "streams") {
        renderStreams(stream_tmpl, streams_list, streams.items);
        sidebarShadows(streams_scrollbox);
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
