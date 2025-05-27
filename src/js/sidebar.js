import { games, streams } from "./common";

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
        const scrollbox = /** @type {HTMLElement} */ (this.querySelector(".scrollbox"));
        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                const toggle_class = entry.target.classList.contains("top") ? "has-top" : "has-bottom";
                this.classList.toggle(toggle_class, !entry.isIntersecting)
            }
        }, { root: scrollbox });

        this.$ = {
            observer: observer,
            scrollbox: scrollbox,
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
        const elems = this.$.scrollbox.querySelectorAll(".intersection");
        for (let i = 0; i < elems.length; i++) {
            this.$.observer.observe(elems[i]);
        }
    }

    disconnectedCallback() {
        this.$.observer.disconnect();
    }

    render() {
        const scrollbox = this.$.scrollbox;
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
