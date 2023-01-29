import { act } from "@artalar/act";
import { renderGames, renderStreams } from "./common";
import { games, games_list, game_tmpl } from "./games";
import { search_items, search_item_tmpl, search_list } from "./search";
import { streams, streams_list, stream_tmpl } from "./streams";

export type SidebarState = "closed" | "games" | "streams" | "search"

export const sidebar_state = act<SidebarState>("closed");

export function renderSidebarItems(state: SidebarState) {
    if (state === "games") {
        renderGames(game_tmpl, games_list, games);
        htmx.process(games_list as HTMLElement);
    } else if (state === "streams") {
        renderStreams(stream_tmpl, streams_list, streams);
        htmx.process(streams_list as HTMLElement);
    } else if (state === "search") {
        renderGames(search_item_tmpl, search_list, search_items);
        htmx.process(games_list as HTMLElement);
    }
}

export const sidebar_nav = document.querySelector(".sidebar-nav")!;

sidebar_state.subscribe((state) => {
    console.log("sub state change", state)
    sidebar_nav.querySelector("#game_name[aria-expanded=true] , .menu-item[aria-expanded=true]")?.setAttribute("aria-expanded", "false");
    if (state !== "closed") {
        const sel = state === "search" ? "#game_name[aria-expanded=false]" : `.menu-item[data-menu-item=${state}]`;
        sidebar_nav.querySelector(sel)?.setAttribute("aria-expanded", "true");
        renderSidebarItems(state);
    }

    // let active = (document.activeElement! as HTMLElement);
    // if (document.activeElement?.tagName === "BUTTON") {
    //     if (state === 'closed') {
    //       active.focus();
    //     } else {
    //       active = (document.activeElement! as HTMLElement);
    //     }
    // }
})
