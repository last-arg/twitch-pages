import { Twitch } from './twitch';
import { clearGames} from './games';
import { settings, current_path } from './global';
import { search_term, search_results, search_list } from './search';
import { addLiveUser, addStream, clearProfiles, clearStreams, live_check, profiles, profile_check, removeLiveUser, removeStream, saveProfileImages, StreamLocal, streams, streams_list, updateLiveStreams, ProfileImages } from './streams';
import { API_URL, Game, twitchCatImageSrc } from './common';
import { initSidebarScroll, SidebarState, sidebar_state, sidebar_state_change } from './sidebar';
import { mainContent, UrlResolve, config } from 'config';
import { topGamesRender, gamesRender, streamsRender, usersRender, videosRender } from './render';
import './libs/twinspark.js';
declare var twinspark: any;
import * as sb from './libs/strawberry';
// @ts-ignore
// import events from 'eventslibjs';
// console.log(events);

declare global {
    interface Window { 
        filterResults: typeof filterResults; 
        resetFilter: typeof resetFilter;
    }
}

const key_streams = "streams"
const key_streams_live = `${key_streams}.live`
const key_live_check = `${key_streams_live}.last_check`
const key_profile = `profile`;
const key_profile_check = `${key_profile}.last_check`;

const fns = {
    cat_img_src: function(src: string) {
        const c_img = config.image.category;
        return twitchCatImageSrc(src, c_img.width, c_img.height);
    },
    cat_url: function(name: string): string {
        return `/directory/game/${window.encodeURIComponent(name)}`;
    },
}

// NOTE: can't add several attributes with different values
sb.directive("attr", function({el, param, value}) {
    let v = value as string;
    if (param) {
        const params = param.split(":");
        const fn_name = params[1] as (keyof typeof fns | undefined);
        if (fn_name) {
            const fn = fns[fn_name];
            v = fn(v);
        }
        for (const key of params[0].split(",")) {
            el.setAttribute(key, v);
        }
    }
}, true)

sb.directive("attr-src", function({el, param, value}) {
    let v = value as string;
    if (param) {
        const fn_name = param as (keyof typeof fns | undefined);
        console.log(fn_name)
        if (fn_name) {
            const fn = fns[fn_name];
            v = fn(v);
        }
    }
    el.setAttribute("src", v);
}, true);

sb.directive("listen", function({ el, value, param }) {
    if (param) {
        el.addEventListener(param, value as any);
    }
  },
  true
);

sb.directive("listen-focus", function({ el, value }) {
    if (value) {
        el.addEventListener("focus", value as any);
    }
  },
);

type SB_Data = {
    filter_value: string,
    follow_games: Game[],
    handle_focus: (e: Event) => void
    handle_blur: (e: Event) => void
    nav: {
        state: SidebarState,
        handle: (e: Event) => void,
    },
    follow: {
        games: Game[],
        streams: StreamLocal[],
        has_game: (id: string) => string, // "true" | "false"
        has_stream: (id: string) => string, // "true" | "false"
    },
} & ReturnType<typeof sb.init>;

const sb_data = sb.init() as SB_Data;

// @debug
// document.querySelector("[data-menu-item='games']")?.setAttribute("aria-expanded", "true");

sb_data.filter_value = "";
sb_data.follow_games = [];
sb_data.handle_focus = () => (e: Event) => {
    console.log("focus")
    search_term((e.target as HTMLInputElement).value);
    sidebar_state("search")
    search_results();
};
sb_data.handle_blur = () => (e: Event) => {
    console.log("blur")
    const input = e.target as HTMLInputElement;
    if (input.value.length === 0) {
        sidebar_state("closed")
    }
};
sb_data.nav = {
    state: "closed",
    handle() { 
        return (e: Event) => {
            const curr = this.state;
            const btn = (e.target as HTMLElement).closest(".menu-item, .btn-close");
            if (btn?.classList.contains("menu-item")) {
                const new_state = btn.getAttribute("data-menu-item");
                if (new_state) {
                    if (curr === new_state) {
                        this.state = "closed"
                    } else {
                        this.state = new_state as SidebarState;
                    } 
                }
                sidebar_state_change(this.state);
            } else if (btn?.classList.contains("btn-close")) {
                this.state = "closed"
                sidebar_state_change(this.state);
            }
        }
    },
},
sb_data.follow = {
    games: JSON.parse(localStorage.getItem("games") ?? "[]"),
    streams: JSON.parse(localStorage.getItem(key_streams) ?? "[]"),
    has_game(id: string) {
        return this.games.some((game) => game.id === id).toString();
    },
    has_stream(id: string) {
        return this.streams.some((stream) => stream.user_id === id).toString();
    },
}

window.filterResults = filterResults;
function filterResults(ev: InputEvent) {
    sb_data.filter_value = (ev.target as HTMLInputElement).value || "";
}

sb.watch("follow_games", function(val) {
    console.log("follow", val.name)
});
sb_data.follow_games = JSON.parse(localStorage.getItem("games") ?? "[]");

sb.watch("filter_value", pageFilter);
console.log(sb_data)

export const twitch = new Twitch();
const live_check_ms = 600000; // 10 minutes
let g_sheet: CSSStyleSheet | null = null;

const extra_globals = { 
    image: {
        profiles: JSON.parse(localStorage.getItem(key_profile) || "{}") as ProfileImages,
        check: parseInt(JSON.parse(localStorage.getItem(key_profile_check) ?? Date.now().toString()), 10),
        fetch_ids: [] as string[],
        f() {
            if (this.fetch_ids.length === 0) { 
                console.log("nothing to fetch")
                return; 
            }
            // TODO: async fetch request
            const ids = this.fetch_ids
            this.fetch_ids = [];
            for (const id of ids) {
                this.profiles[id] = { url: "https://placehold.co/400", last_access: 0 };
            }
        },
        // set_profile(user_id: string) {
        //     this.profiles[user_id] = {url: "#hello", last_access: 0};
        // },
        user_src: function(user_id: string) {
            let img_src = this.profiles[user_id]?.url;
            if (!img_src) {
                img_src = `#${user_id}`;
                // TODO: get user img
                // this.new_profiles = [];
                this.fetch_ids.push(user_id);
            }
            return img_src;
        },
    },
    cat_img_src(src: string) {
        const c_img = config.image.category;
        return twitchCatImageSrc(src, c_img.width, c_img.height);
    },
    cat_url(name: string): string {
        return `/directory/game/${window.encodeURIComponent(name)}`;
    },
    user_url(name: string): string {
        return `/${window.encodeURIComponent(name)}/videos`;
    },
    live: {
        streams: JSON.parse(localStorage.getItem(key_streams_live) || "{}"),
        check: parseInt(JSON.parse(localStorage.getItem(key_live_check) ?? "0"), 10),
        has_user(id: string) {
            return !!this.streams[id];
        }
    },
    games_search: (e: Event) => {
        search_term((e.target as HTMLInputElement).key);
        // TODO: reenable
        search_results();
    },
    encode_json(obj: any) {
        return encodeURIComponent(JSON.stringify(obj));
    },
    handle_path_change: handlePathChange,
    handle_follow(e: Event) {
        gameAndStreamFollow.call(this, e.target as Element);
        // TODO: find better solution. fire only when changed
        localStorage.setItem("games", JSON.stringify(this.follow.games))
        localStorage.setItem("streams", JSON.stringify(this.follow.streams))
    },
};

document.addEventListener("ts-req-before", (e) => {
    const req = e.detail?.req;
    const url_str = req.url;
    if (url_str && url_str.startsWith("/helix/games/top")) {
        const url = new URL(url_str, API_URL)
        const req_url = url.toString();
        req.opts.data.set("first", settings.general()["top-games-count"]);
        req.url = req_url;
        req.opts.headers = Twitch.headers;
    } else if (url_str && url_str.startsWith("/helix/games")) {
        const url = new URL(url_str, API_URL)
        const req_url = url.toString();
        req.url = req_url;
        req.opts.headers = Twitch.headers;

        const path = current_path() || location.pathname;
        const path_arr = path.split("/")
        req.opts.data.set("name", decodeURIComponent(path_arr[path_arr.length - 1]));
        current_path(null)
    } else if (url_str && url_str.startsWith("/helix/streams")) {
        const url = new URL(url_str, API_URL)
        const req_url = url.toString();
        req.url = req_url;
        req.opts.data.set("first", settings.general()["category-count"]);
        if (!settings.category().show_all) {
          req.opts.data.set("language", settings.category().languages);
        }
        req.opts.headers = Twitch.headers;
    } else if (url_str && url_str.startsWith("/helix/users")) {
        const url = new URL(url_str, API_URL)
        const req_url = url.toString();
        req.url = req_url;
        req.opts.headers = Twitch.headers;
        const path = current_path() || location.pathname;
        const path_arr = path.split("/")
        req.opts.data.set("login", decodeURIComponent(path_arr[1]));
        current_path(null)
    } else if (url_str && url_str.startsWith("/helix/videos")) {
        const url = new URL(url_str, API_URL)
        const req_url = url.toString();
        req.url = req_url;
        req.opts.data.set("first", settings.general()["user-videos-count"]);
        req.opts.headers = Twitch.headers;
    }
});

document.addEventListener("ts-req-ok", (e) => {
    const detail = e.detail;
    const url_str = detail.url;
    if (!url_str) {
        return;
    }
    const url = new URL(url_str);
    if (url.host !== "api.twitch.tv") {
        return;
    }

    if (url.pathname.startsWith("/helix/games/top")) {
        const json = JSON.parse(detail.content);
        detail.content = topGamesRender(json);
        const cursor = json.pagination.cursor;
        const btn = document.querySelector(".btn-load-more");
        if (cursor) {
            btn?.setAttribute("aria-disabled", "false");
            btn?.setAttribute("ts-data", "after=" + cursor);
        } else {
            btn?.setAttribute("aria-disabled", "true");
            btn?.removeAttribute("ts-data");
        }
    } else if (url.pathname.startsWith("/helix/games")) {
        const json = JSON.parse(detail.content);
        // TODO: Failed response
        detail.content = gamesRender(json);
        detail.headers["ts-title"] = `${json.data[0].name} | Twitch Pages`;
        const game_id = json.data[0].id;
        const btn = document.querySelector(".btn-load-more")!;
        btn.parentElement!.setAttribute("ts-data", "game_id=" + game_id);
        btn.dispatchEvent(new CustomEvent("click"));
    } else if (url.pathname.startsWith("/helix/streams")) {
        const json = JSON.parse(detail.content);
        detail.content = streamsRender(json);

        const btn = document.querySelector(".btn-load-more")!;
        const cursor = json.pagination.cursor;
        if (cursor) {
            btn.setAttribute("aria-disabled", "false");
            btn.setAttribute("ts-data", "after=" + cursor);
        } else {
            btn.setAttribute("aria-disabled", "true");
            btn?.removeAttribute("ts-data");
        }
    } else if (url.pathname.startsWith("/helix/users")) {
        const json = JSON.parse(detail.content);
        if (detail.status !== 200 || json.data.length === 0) {
            const pathArr = location.pathname.split("/")
            return `
              <h2>${decodeURIComponent(pathArr[1])}</h2>
              <div id="feedback" ts-swap-push="#feedback">User not found</div>
            `;
        }

        detail.content = usersRender(json);
        detail.headers["ts-title"] = `${json.data[0].display_name} | Twitch Pages`;
        const user_id = json.data[0].id;
        const btn = document.querySelector(".btn-load-more")!;
        btn.parentElement!.setAttribute("ts-data", "user_id=" + user_id);
        btn.dispatchEvent(new CustomEvent("click"));
    } else if (url.pathname.startsWith("/helix/videos")) {
        const json = JSON.parse(detail.content);
        detail.content = videosRender(json);

        const btn = document.querySelector(".btn-load-more")!;
        const cursor = json.pagination.cursor;
        if (cursor) {
            btn.setAttribute("aria-disabled", "false");
            btn.setAttribute("ts-data", "after=" + cursor);
        } else {
            btn.setAttribute("aria-disabled", "true");
            btn?.removeAttribute("ts-data");
        }
    }
    return;
});

document.querySelector("#main")!.addEventListener("ts-ready", (e) => {
    const elem = e.target as Element;
    if (elem.id === "page-category") {
        initFilter(elem);
    } else if (elem.id === "page-user") {
        initUserVideoTypeFilter(elem)
        initFilter(elem);
    } else if (elem.id === "page-settings") {
        document.title = "Settings | Twitch Pages";
        initSettings(elem);
        twinspark.replaceState(window.location.toString());
    } else if (elem.id === "page-home") {
        document.title = "Home | Twitch Pages";
        twinspark.replaceState(window.location.toString());
    } else if (elem.tagName === "LI") {
        // TODO: limit this on pages that need it
        // pages: top-games (root)
    } else if (elem.classList.contains("user-heading-box")) {
    }
});

function initUserVideoTypeFilter(elem: Element) {
    const fieldset = elem.querySelector(".filter-video-type");
    const output_list = elem.querySelector(".output-list");
    const general = settings.general();
    for (const which of ["archive", "upload", "highlight"]) {
        const key = `video-${which}s`;
        // @ts-ignore
        const check_value = !!general[key];
        const input = fieldset?.querySelector(`#check-${which}`) as HTMLInputElement;
        input.checked = check_value;
        if (check_value === false) {
            output_list?.classList.add(`no-${which}s`);
        }
    }

    fieldset?.addEventListener("click", (e: Event) => {
        const elem = e.target as HTMLInputElement;
        if (elem.nodeName === "INPUT") {
            if (elem.checked) {
                output_list?.classList.remove(`no-${elem.value}s`);
            } else {
                output_list?.classList.add(`no-${elem.value}s`);
            }
        }
    })
}

function initRoute() {
    const r = getUrlObject(location.pathname);
    const main = document.querySelector("#main");
    const req = twinspark.makeReq(main, new Event("load"), false, {url: r.html});
    twinspark.executeReqs(req);
}

function getUrlObject(newPath: string): UrlResolve {
  if (newPath === "/") return mainContent["top-games"]
  let contentKey = "not-found"
  const newDirs = newPath.split("/").filter((path) => path.length > 0)
  for (const key in mainContent) {
    const obj = mainContent[key]
    const dirs = obj.url.split("/").filter((path) => path.length > 0)
    if (dirs.length !== newDirs.length || dirs.length === 0) continue
    let isMatch = true
    for (let i = 0; i < dirs.length; i+=1) {
      const dir = dirs[i]
      if (dir[0] === ":") continue
      if (dir !== newDirs[i]) {
        isMatch = false
        break
      }
    }
    if (isMatch) {
      contentKey = key
      break
    }
  }
  return mainContent[contentKey]
}


async function startup() {
    await twitch.fetchToken();
    // const page_cache = await caches.open('page_cache');

    initRoute();
    initHeader(document.body)
    initSidebarScroll();
    if (live_check + live_check_ms < Date.now()) {
        updateLiveUsers();
    } else {
        setTimeout(updateLiveUsers, live_check_ms);
    }
    removeOldProfileImages();
};
window.addEventListener("DOMContentLoaded", startup);

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
    const new_live_streams = (await twitch.fetchLiveUsers(curr_ids));
    updateLiveStreams(new_live_streams);
    setTimeout(updateLiveUsers, live_check_ms);
}

function pageFilter(input: unknown) {
    let value = input as string;
    if (g_sheet === null) return;
    if (g_sheet.cssRules.length > 0) {
        g_sheet.deleteRule(0)
    }
    value = value.trim();
    if (value.length > 0) {
        g_sheet.insertRule(`.output-list > :not(li[data-title*='${encodeURIComponent(value)}' i]) { display: none !important }`, 0);
    }
}

window.resetFilter = resetFilter;
function resetFilter() {
    if (g_sheet === null) return;
    g_sheet.deleteRule(0)
}

function initFilter(root: Element) {
    const search_form = root.querySelector(".search-form")!;
    g_sheet = (search_form.insertAdjacentElement('afterend', document.createElement('style')) as HTMLStyleElement).sheet;
}

function initHeader(root: Element) {
    initHeaderSearch()
    initHeaderStreams(root);
}

function initHeaderStreams(root: Element) {
    streams_list.addEventListener("mousedown", handlePathChange)
}

function initHeaderSearch() {
    search_list.addEventListener("mousedown", handlePathChange);
}

function gameAndStreamFollow(t: Element) {  
    const btn = t.classList.contains("button-follow") ? t : t.closest(".button-follow");
    if (btn) {
        const item_raw = btn.getAttribute("data-item");
        if (item_raw) {
            const item_untyped = JSON.parse(decodeURIComponent(item_raw));
            const following = (btn.getAttribute("data-is-followed") || "false") === "true";
            if (item_untyped.user_id) {
                const item = item_untyped as StreamLocal;
                const streams = this.follow.streams;
                if (following) {
                    let i = 0;
                    for (; i < streams.length; i++) {
                        const stream = streams[i];
                        if (stream.user_id === item.user_id) {
                            break;
                        }
                    }
                    if (i === streams.length) {
                        return;
                    }
                    console.log("idx", i)
                    streams.splice(i, 1);

                    // TODO: remove live user
                    // removeLiveUser(item.user_id);
                } else {
                    streams.push(item)
                    streams.sort((a: StreamLocal, b: StreamLocal) => a.user_name.toLowerCase() > b.user_name.toLowerCase())
                    // TODO: add live user
                    // addLiveUser(twitch, item.user_id);
                }
            } else {
                const item = item_untyped as Game;
                const games = this.follow.games;
                if (following) {
                    let i = 0;
                    for (; i < games.length; i++) {
                        const game = games[i];
                        if (game.id === item.id) {
                            break;
                        }
                    }
                    if (i === games.length) {
                        return;
                    }
                    games.splice(i, 1);
                } else {
                    games.push(item)
                    games.sort((a: Game, b: Game) => a.name > b.name);
                }
            }
            btn.setAttribute("data-is-followed", (!following).toString())
        }
    }
}

function handlePathChange(e: Event) {
    const target = e.target as Element;
    const hx_link = target.closest("a[ts-req-history]");
    current_path(hx_link?.getAttribute("ts-req-history") || null);
}

function initSettings(root: Element) {
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

