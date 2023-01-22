import { act } from "@artalar/act";

export type SidebarState = "closed" | "games" | "streams" | "search"

export const sidebar_state = act<SidebarState>("closed")

export const sidebar_nav = document.querySelector(".sidebar-nav")!;

sidebar_state.subscribe((state) => {
    sidebar_nav.querySelector(".menu-item[aria-expanded=true]")?.setAttribute("aria-expanded", "false");
    if (state !== "closed") {
        sidebar_nav.querySelector(`.menu-item[data-menu-item=${state}]`)?.setAttribute("aria-expanded", "true");
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
