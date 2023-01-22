import { act } from "@artalar/act";

export type SidebarState = "closed" | "games" | "streams" | "search"

export const sidebar_state = act<SidebarState>("closed");

export const sidebar_nav = document.querySelector(".sidebar-nav")!;

sidebar_state.subscribe((state) => {
    console.log("sub state change", state)
    sidebar_nav.querySelector("#game_name[aria-expanded=true] , .menu-item[aria-expanded=true]")?.setAttribute("aria-expanded", "false");
    if (state !== "closed") {
        const sel = state === "search" ? "#game_name[aria-expanded=false]" : `.menu-item[data-menu-item=${state}]`;
        sidebar_nav.querySelector(sel)?.setAttribute("aria-expanded", "true");
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
