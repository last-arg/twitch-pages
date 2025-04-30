import { games, sidebar, streams, init_common } from "./common";
import { twitch } from "./twitch";

/**
@typedef {import("./streams").StreamLocal} StreamLocal
@typedef {import("./common").Game} Game
@typedef {import("./sidebar").SidebarState} SidebarState
*/

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
};
window.addEventListener("DOMContentLoaded", startup);
