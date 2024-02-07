import { games, streams, game_search } from "./common";

/** @typedef {"closed" | "games" | "streams" | "search"} SidebarState */

// @ts-ignore
const htmx = /** @type {import("htmx.org")} */ (window.htmx);

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
              if (state === "games") {
                  games.render();
              } else if (state === "streams") {
                  streams.render();
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

export class ScrollContainer extends HTMLElement {
  constructor() {
    super();
    const _this = this;
    this.$ = {
      scrolling: false,
      handleScroll() {
        if (!this.scrolling) {
          window.requestAnimationFrame(() => {
            _this.render();
            this.scrolling = false;
          });
          this.scrolling = true;
        }
      } 
    };
  }

  connectedCallback() {
      // Add/remove shadows when scrolling
        const scrollbox = this.querySelector('.scrollbox');
        if (!scrollbox) {
          console.error("Could not find '.scrollbar' inside <scroll-container>");
          return;
        }
        scrollbox.addEventListener("scroll", this.$.handleScroll, {passive: true});
        this.addEventListener("update", () => console.log("update"))
  }

  disconnectedCallback() {
    this.querySelector(".scrollbox")?.removeEventListener("scroll", this.$.handleScroll);
  }

  render() {
      const scrollbox = /** @type {HTMLElement} */ (this.querySelector(".scrollbox"));
      if (scrollbox === null) {
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
        this.setAttribute("data-scroll-shadow", shadow_type);
      } else {
        this.removeAttribute("data-scroll-shadow");
      }
  }
}

customElements.define("scroll-container", ScrollContainer)
