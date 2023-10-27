import { Twitch } from './twitch';
import { clearGames} from './games';
import { settings, current_path } from './global';
import { search_term, search_results, search_list } from './search';
import { addStream, clearProfiles, clearStreams, live_check, profiles, profile_check, removeStream, saveProfileImages, StreamLocal, streams, streams_list, updateLiveStreams, ProfileImages, live_streams_local } from './streams';
import { API_URL, Game, StreamTwitch, twitchCatImageSrc } from './common';
import { initSidebarScroll, SidebarState, sidebar_state, sidebar_state_change } from './sidebar';
import { mainContent, UrlResolve, config } from 'config';
import { initHtmx } from "./htmx_init";
import { action } from 'nanostores'
import { persistentAtom } from '@nanostores/persistent' 
// @ts-ignore
// import events from 'eventslibjs';
// console.log(events);

declare global {
    interface Window { 
        follow: typeof follow; 
    }
}

// TODO: when opening streams sidebar check for missing live stream ids. 

export const twitch = new Twitch();

const live_users = persistentAtom<Record<string, string>>("live_users", {}, {
  encode: JSON.stringify,
  decode: JSON.parse,
})
const addLiveUser = action(live_users, 'addLiveUser', async (store, user_id: string) => {
    const new_value = live_users.get();
    if (!new_value[user_id]) {
        const stream = (await twitch.fetchStreams([user_id]))
        if (stream.length > 0) {
            new_value[user_id] = stream[0].game_name;
            store.set(new_value);
        }
    }
})

window.addEventListener("htmx:load", (e: Event) => {
    const elem = e.target as Element;
    if (elem.classList.contains("user-heading-box")) {
        const elem_card = elem!.querySelector(".js-card-live")!;
        const stream_id = elem_card.getAttribute("data-stream-id")!;
        const game = live_users.get()[stream_id];
        if (game) {
            const link = elem_card.querySelector("a")!;
            link.textContent = game;
            link.href = "https://twitch.tv/directory/game/" + encodeURIComponent(game);
            elem_card.classList.remove("hidden");
        } else {
            addLiveUser(stream_id);
        }
    } else if (elem.id === "partial-settings") {
        document.title = "Settings | Twitch Pages";
        initSettings(elem);
    } else if (elem.id === "page-user") {
        initUserVideoTypeFilter(elem);
    }
});

const key_streams = "streams"
const key_streams_live = `${key_streams}.live`
const key_live_check = `${key_streams_live}.last_check`
const key_profile = `profile`;
const key_profile_check = `${key_profile}.last_check`;

const follow = {
    games: JSON.parse(localStorage.getItem("games") ?? "[]"),
    streams: JSON.parse(localStorage.getItem(key_streams) ?? "[]"),
    has_game(id: string) {
        return this.games.some((game: Game) => game.id === id).toString();
    },
    has_stream(id: string) {
        return this.streams.some((stream: StreamTwitch) => stream.user_id === id).toString();
    },
    save_games() {
        localStorage.setItem("games", JSON.stringify(this.games))
    },
    save_streams() {
        localStorage.setItem("streams", JSON.stringify(this.streams))
    },
    toggleStreamFollow(item: StreamLocal, following: boolean): FollowUpdate {
        const streams = this.streams;
        if (following) {
            let i = 0;
            for (; i < streams.length; i++) {
                const stream = streams[i];
                if (stream.user_id === item.user_id) {
                    break;
                }
            }
            if (i === streams.length) {
                return false;
            }
            streams.splice(i, 1);
        } else {
            streams.push(item)
            streams.sort((a: StreamLocal, b: StreamLocal) => a.user_name.toLowerCase() > b.user_name.toLowerCase())
        }
        return "stream";
    },
    toggleGameFollow(item: Game, following: boolean): FollowUpdate {
        const games = this.games;
        if (following) {
            let i = 0;
            for (; i < games.length; i++) {
                const game = games[i];
                if (game.id === item.id) {
                    break;
                }
            }
            if (i === games.length) {
                return false;
            }
            games.splice(i, 1);
        } else {
            games.push(item)
            games.sort((a: Game, b: Game) => a.name > b.name);
        }
        return "game";
    }
}

window.follow = follow;

type FollowUpdate = "stream" | "game" | false;

function gameAndStreamFollow(t: HTMLElement): FollowUpdate {
    const btn = t.closest(".button-follow");
    var result: FollowUpdate = false;
    if (btn) {
        const item_raw = btn.getAttribute("data-item");
        if (item_raw) {
            const item_untyped = JSON.parse(decodeURIComponent(item_raw));
            const following = (btn.getAttribute("data-is-followed") || "false") === "true";
            if (item_untyped.user_id) {
                result = follow.toggleStreamFollow(item_untyped as StreamLocal, following);
            } else {
                result = follow.toggleGameFollow(item_untyped as Game, following);
            }
            btn.setAttribute("data-is-followed", (!following).toString())
        }
    }
    return result;
}

document.addEventListener("click", function(e: Event) {
    const update_type = gameAndStreamFollow(e.target as HTMLElement)

    if (update_type === "game") {
        follow.save_games();
    } else if (update_type === "stream") {
        follow.save_streams();
    }

    const btn = (e.target as HTMLElement).closest(".menu-item, .btn-close");
    if (btn?.classList.contains("menu-item")) {
        let new_state = btn.getAttribute("data-menu-item") as SidebarState || "closed";
        const is_expanded = btn.getAttribute("aria-expanded") || "false";
        if (is_expanded === "true") {
            new_state = "closed"
        }
        sidebar_state_change(new_state);
    } else if (btn?.classList.contains("btn-close")) {
        sidebar_state_change("closed");
    }
});

const form_search = document.querySelector("form")!;
const input_search = form_search.querySelector("#game_name")!;

form_search.addEventListener("input", function(e: Event) {
    e.preventDefault();
    search_term((e.target as HTMLInputElement).value);
    search_results();
});

input_search.addEventListener("focus", function(e: Event) {
    search_term((e.target as HTMLInputElement).value)    
    sidebar_state("search");
    search_results();
});

input_search.addEventListener("blur", function(e: Event) {
    if ((e.target as HTMLInputElement).value.length === 0) {
        sidebar_state("closed")
    }
});


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
    encode_json(obj: any) {
        return encodeURIComponent(JSON.stringify(obj));
    },
    handle_follow(e: Event) {
        gameAndStreamFollow.call(this, e.target as Element);
    },
};

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
    initHtmx();
    document.body.addEventListener("mousedown", handlePathChange)
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


function handlePathChange(e: Event) {
    const target = e.target as Element;
    const hx_link = target.closest("a[hx-push-url]");
    current_path(hx_link?.getAttribute("hx-push-url") || null);
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

