import { Twitch } from './twitch';
import { addGame, clearGames, games_list, removeGame } from './games';
import { settings, current_path } from './global';
import { search_term, search_results, search_list } from './search';
import { SidebarState, sidebar_nav, sidebar_state } from './sidebar';
import { filter_stylesheet, filter_value } from './search_filter';
import { addLiveUser, addStream, clearProfiles, clearStreams, live_changes, live_check, live_streams, profiles, profile_check, removeLiveUser, removeStream, saveProfileImages, StreamLocal, streams, streams_list, streams_update } from './streams';
import { Game, StreamTwitch, TWITCH_MAX_QUERY_COUNT } from './common';
import { initHtmx } from './htmx_init';

window.addEventListener("htmx:load", (e: Event) => {
    const elem = e.target as Element;
    if (elem.classList.contains("user-live")) {
        const stream_id = elem?.getAttribute("data-stream-id");
        if (stream_id) {
            const game = live_streams[stream_id];
            if (game) {
                const link = elem!.querySelector("a")!;
                link.textContent = game;
                link.href = "https://twitch.tv/directory/game/" + encodeURIComponent(game);
                elem!.classList.remove("hidden");
            }
        }
    } 
});

window.addEventListener("htmx:pushedIntoHistory", (e) => {
    changePage(document.location.pathname, e.target as Element);
})

export const twitch = new Twitch();
const live_check_ms = 600000; // 10 minutes

(async function startup() {
    await twitch.fetchToken();
    const page_cache = await caches.open('page_cache');
    initHtmx(page_cache);
    initHeader(document.body)
    const main = document.querySelector("#main")!;
    main.addEventListener("mousedown", handlePathChange);
    main.addEventListener("click", handleGameAndStreamFollow);
    if (live_check + live_check_ms < Date.now()) {
        updateLiveUsers();
    } else {
        setTimeout(updateLiveUsers, live_check_ms);
    }
    removeOldProfileImages();
})();

function removeOldProfileImages() {
    const a_day = 24 * 60 * 60 * 1000;
    const check_time = profile_check() + a_day;

    for (const id in profiles) {
        if (profiles[id].last_access > check_time) {
            delete profiles[id];
        }
    }

    saveProfileImages();
}

async function updateLiveUsers() {
    const curr_ids = streams.map(({user_id}) => user_id);
    const new_live_streams = (await fetchLiveUsers(twitch, curr_ids));
    live_changes(new_live_streams);
    setTimeout(updateLiveUsers, live_check_ms);
}

// TODO: move to Twitch?
async function fetchLiveUsers(twitch: Twitch, user_ids: string[]): Promise<StreamTwitch[]> {
    let result: StreamTwitch[] = [];
    if (user_ids.length === 0) return result;
    const batch_count = Math.ceil(user_ids.length / TWITCH_MAX_QUERY_COUNT)
    // TODO: use Promise.all() instead?
    for (let i = 0; i < batch_count; i+=1) {
        const start = i * TWITCH_MAX_QUERY_COUNT
        const end = start + TWITCH_MAX_QUERY_COUNT
        const streams = await twitch.fetchStreams(user_ids.slice(start, end))
        result.push(...streams);
    }
    return result;
}

function changePage(path: string, target: Element) {
    if (path === "/settings") {
        document.title = "Settings | Twitch Pages";
        initSettings(target);
    } else if (path === "/") {
        document.title = "Home | Twitch Pages";
    } else if (path.startsWith("/directory/game/")) {
        initCategory(target);
    } else if (path.endsWith("/videos")) {
        console.log("TODO: videos")
    }
}

function initCategory(root: Element) {
    // filter search
    const search_form = root.querySelector(".search-form")!;
    const stylesheet = (search_form.insertAdjacentElement('afterend', document.createElement('style')) as HTMLStyleElement).sheet;
    filter_stylesheet(stylesheet);
    search_form.addEventListener("submit", (e: Event) => e.preventDefault());
    search_form.addEventListener("reset", (_: Event) => filter_value(""));
    search_form.querySelector("input")?.addEventListener("input", (e: Event) => {
        filter_value((e.target as HTMLInputElement).value);
    });
}

function initHeader(root: Element) {
    sidebar_nav.addEventListener("click", (e: Event) => {
        const curr = sidebar_state();
        const btn = (e.target as HTMLElement).closest(".menu-item, .btn-close");
        if (btn?.classList.contains("menu-item")) {
            const new_state = btn.getAttribute("data-menu-item");
            if (new_state === "search") {
                (sidebar_nav.querySelector("#game_name") as HTMLInputElement).focus();
                return;
            }
            if (new_state) {
                if (curr === new_state) {
                    sidebar_state("closed");
                } else {
                    sidebar_state(new_state as SidebarState);
                } 
            }
        } else if (btn?.classList.contains("btn-close")) {
            sidebar_state("close" as SidebarState);
        }
    });

    initHeaderGames(root);
    initHeaderSearch()
    initHeaderStreams(root);
}

function initHeaderStreams(root: Element) {
    streams_list.addEventListener("mousedown", handlePathChange)
    streams_list.addEventListener("click", handleGameAndStreamFollow);
}

function initHeaderSearch() {
    sidebar_nav.querySelector("form")!.addEventListener("submit", (e: Event) => {
        e.preventDefault()
        sidebar_state("search");
    });
    const game_name = sidebar_nav.querySelector("#game_name")!;
    game_name.addEventListener("input", (e: Event) => {
        search_term((e.target as HTMLInputElement).value);
        search_results();
    })
    game_name.addEventListener("focus", (e: Event) => {
        search_term((e.target as HTMLInputElement).value);
        sidebar_state("search")
        search_results();
    });
    game_name.addEventListener("blur", (e: Event) => {
        const input = e.target as HTMLInputElement;
        if (input.value.length === 0) {
            sidebar_state("closed")
        }
    });

    game_name.addEventListener("keyup", (e: Event) => {
        const evt = e as KeyboardEvent;
        if (evt.key === "Escape") {
            sidebar_state("closed");
        }
    });

    search_list.addEventListener("mousedown", handlePathChange);
    search_list.addEventListener("click", handleGameAndStreamFollow);
}

function initHeaderGames(_root: Element) {
    games_list.addEventListener("mousedown", handlePathChange)
    games_list.addEventListener("click", handleGameAndStreamFollow);
}

function handleGameAndStreamFollow(e: Event) {  
    const t = (e.target as Element);
    const btn = t.classList.contains("button-follow") ? t : t.closest(".button-follow");
    if (btn) {
        const item_raw = btn.getAttribute("data-item");
        if (item_raw) {
            const item_untyped = JSON.parse(decodeURIComponent(item_raw));
            const following = (btn.getAttribute("data-is-followed") || "false") === "true";
            if (item_untyped.user_id) {
                const item = item_untyped as StreamLocal;
                if (following) {
                    removeStream(item.user_id);
                    removeLiveUser(item.user_id);
                } else {
                    addStream(item);
                    addLiveUser(twitch, item.user_id);
                }
                streams_update()
            } else {
                const item = item_untyped as Game;
                if (following) {
                    removeGame(item.id);
                } else {
                    addGame(item);
                }
            }
            btn.setAttribute("data-is-followed", (!following).toString())
        }
    }
}

function handlePathChange(e: Event) {
    const target = e.target as Element;
    const hx_link = target.closest("a[hx-push-url]");
    current_path(hx_link?.getAttribute("hx-push-url") || null);
}

function initSettings(root:  Element) {
    initCategorySettings(root);
    initGeneralSettings(root);
    initCacheSettings(root);
}

function initCacheSettings(root:  Element) {
    root.querySelector(".js-cache-list")?.addEventListener("click", (e: Event) => {
        const t = e.target as Element;
        if (t.classList.contains("js-clear-games")) {
            clearGames();
        } else if (t.classList.contains("js-clear-streams")) {
            clearStreams();
        } else if (t.classList.contains("js-clear-profiles")) {
            clearProfiles();
        } else if (t.classList.contains("js-clear-all")) {
            clearGames();
            clearStreams();
            clearProfiles();
        }
    })
}

function initGeneralSettings(root:  Element) {
    const general = settings.general();
    for (const key in general) {
        // @ts-ignore
        const value = general[key as any];
        const input = root.querySelector(`#${key}`) as HTMLInputElement | undefined;
        if (input) {
            if (input.type === "number") {
                input.value = value;
            } else if (input.type === "checkbox") {
                input.checked = value === "on";
            }
        }
    }

    root.querySelector("#settings-general")?.addEventListener("submit", handleFormSubmit);
    
    function handleFormSubmit(e: Event) {
        e.preventDefault();
        const elem = e.target as HTMLFormElement;
        let new_settings: ReturnType<typeof settings.general> = {} as any;
        // @ts-ignore
        (new FormData(elem)).forEach(function(value, key){ new_settings[key as any] = value });
        settings.general(new_settings)
    }
}

function initCategorySettings(root:  Element) {
    const options = root.querySelectorAll("#lang-list option");
    const lang_map = new Map();
    // @ts-ignore
    for (let opt of options) {
        lang_map.set(opt.getAttribute("lang-code")!, opt.value)
    }

    for (const lang of settings.category().languages) {
        addLang(lang);
    }
    hasLanguages();
    
    const form_category = root.querySelector("#form-category")!;
    form_category.addEventListener("submit", handleFormSubmit);
    form_category.addEventListener("click", handleFormClick);
    form_category.addEventListener("keydown", handleFormKeydown);

    function addLang(lang: string) {
      const ul = document.querySelector(".enabled-languages")!;
      const tmpl = ul.querySelector("template")!;
      const new_elem = tmpl.content.firstElementChild!.cloneNode(true) as  Element;
      const input = new_elem.querySelector("input")!;
      new_elem.querySelector("p")!.textContent = lang_map.get(lang);
      input.setAttribute("value", lang)
      ul.append(new_elem);
    }

    function hasLanguages() {
        const msg_elem = root.querySelector(".js-languages-msg")!;
        if (root.querySelectorAll(".enabled-languages > li").length > 0) {
            msg_elem.classList.add("hidden")
        } else {
            msg_elem.classList.remove("hidden")
        }
    }

    function handleFormKeydown(event: Event) {
        const elem = event.target as HTMLInputElement; 
        if (elem.nodeName === "INPUT" && elem.id === "pick-lang") {
            event.preventDefault();
            addLangFromInput(elem as HTMLInputElement);
        }
    }

    function addLangFromInput(input: HTMLInputElement) {
        const lang_value = input.value;
        if (lang_value) {
            const opt = document.querySelector(`option[value=${lang_value}]`)
            if (opt && !document.querySelector(`input[value=${lang_value}]`)) { 
              addLang(opt.getAttribute("lang-code")!);
              input.value = "";
              hasLanguages();
            }
        }
    }
    
    function handleFormClick(event: Event) {
        const elem = event.target as HTMLButtonElement; 
        if (elem.nodeName === "BUTTON") {
          if (elem.classList.contains("add-lang")) {
            addLangFromInput(elem.previousElementSibling as HTMLInputElement);
          } else if (elem.classList.contains("remove-lang")) {
            elem.closest("li")!.remove();
            hasLanguages();
          }
        }
    }
   
    function handleFormSubmit(event: Event) {
        event.preventDefault();
        const elem = event.target as HTMLFormElement;
        const f_data = new FormData(elem);
        let curr = settings.category();
        curr.languages = f_data.getAll("lang") as string[];
        curr.show_all = f_data.get("all-languages") as any;
        settings.category({...curr});
    }
}
