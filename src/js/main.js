import { games, live, sidebar, streams, settings, state, init_common } from "./common";
import { twitch } from "./twitch";
import { initHtmx } from "./htmx_init";

/**
@typedef {import("./streams").StreamLocal} StreamLocal
@typedef {import("./common").Game} Game
@typedef {import("./sidebar").SidebarState} SidebarState
*/

document.addEventListener("htmx:pushedIntoHistory", (/** @type {Event} */ e) => {
    state.set_page_path(e.detail.path);
});

window.addEventListener("htmx:load", (/** @type {Event} */ e) => {
    const elem = /** @type {Element} */ (e.target);
    if (elem.classList.contains("user-heading-box")) {
        const elem_card = /** @type {Element} */ (elem.querySelector(".js-card-live"));
        const stream_id = /** @type {string} */ (elem_card.getAttribute("data-stream-id"));
        const game = live.store.users[stream_id];
        if (game) {
            live.$.renderUserLiveness(stream_id, elem_card);
        } else {
            live.addUser(stream_id);
        }
    } else if (elem.id === "page-settings") {
        settings.init(elem)
    }
});

/**
@param {HTMLElement} t
*/
function gameAndStreamFollow(t) {
    const btn = t.closest(".button-follow");
    if (!btn) { return; }

    const item_raw = btn.getAttribute("data-item");
    if (!item_raw) { return; }

    const item_untyped = JSON.parse(decodeURIComponent(item_raw));
    const following = (btn.getAttribute("data-is-followed") || "false") === "true";
    if (item_untyped.user_id) {
        if (following) {
            streams.unfollow(item_untyped.user_id);
        } else {
            streams.follow(/** @type {StreamLocal} */ item_untyped);
        }
    } else {
        if (following) {
            games.unfollow(item_untyped.id);
        } else {
            games.follow(/** @type {Game} */ item_untyped);
        }
    }
    btn.setAttribute("data-is-followed", (!following).toString())
}

document.addEventListener("click", function(/** {Event} */e) {
    const target = /** @type {HTMLElement} */ (e.target);
    gameAndStreamFollow(target)

    const btn = target.closest(".menu-item, .btn-close");
    if (btn?.classList.contains("menu-item")) {
        let new_state = /** @type {SidebarState} */ (btn.getAttribute("data-menu-item")) || "closed";
        const is_expanded = btn.getAttribute("aria-expanded") || "false";
        if (is_expanded === "true") {
            new_state = "closed"
        }
        sidebar.setState(new_state);
    } else if (btn?.classList.contains("btn-close")) {
        sidebar.setState("closed");
    }
});

async function startup() {
    await twitch.fetchToken();
    init_common();
    initHtmx();
};
window.addEventListener("DOMContentLoaded", startup);

