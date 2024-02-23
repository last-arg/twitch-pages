import { games, live, sidebar, streams, settings, state } from "./common";
import { twitch } from "./twitch";
import { initHtmx } from "./htmx_init";

/**
@typedef {import("./streams").StreamLocal} StreamLocal
@typedef {import("./common").Game} Game
@typedef {import("./sidebar").SidebarState} SidebarState
*/

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
        document.title = "Settings | Twitch Pages";
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
    initHtmx();
    document.body.addEventListener("mousedown", handlePathChange)
};
window.addEventListener("DOMContentLoaded", startup);

/** @param {Event} e */
function handlePathChange(e) {
    const target = /** @type {Element} e */ (e.target);
    const hx_link = target.closest("a[hx-push-url]");
    state.setPath(hx_link?.getAttribute("hx-push-url") || null);
}


