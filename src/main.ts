import { clearGames, followGame, unfollowGame} from './games';
import { current_pathname, settings, SettingsGeneral } from './global';
import { search_value, } from './search';
import { StreamLocal, ProfileImages, unfollowStream, followStream, live_users, addLiveUser, removeOldProfileImages, updateLiveUsers } from './streams';
import { Game, twitchCatImageSrc } from './common';
import { twitch } from './twitch';
import { initSidebarScroll, sb_state, SidebarState } from './sidebar';
import { mainContent, UrlResolve, config } from 'config';
import { initHtmx } from "./htmx_init";
// @ts-ignore
// import events from 'eventslibjs';
// console.log(events);

declare global {
    interface Window { 
        filterItems: typeof pageFilter;
        resetFilter: typeof resetFilter;
    }
}

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
    } else if (elem.id === "page-user") {
        initFilter(elem);
        initUserVideoTypeFilter(elem);
    } else if (elem.id === "page-category") {
        initFilter(elem);
    } else if (elem.id === "partial-settings") {
        document.title = "Settings | Twitch Pages";
        initSettings(elem);
    }
});

const key_streams = "streams"
const key_streams_live = `${key_streams}.live`
const key_live_check = `${key_streams_live}.last_check`
const key_profile = `profile`;
const key_profile_check = `${key_profile}.last_check`;

function gameAndStreamFollow(t: HTMLElement) {
    const btn = t.closest(".button-follow");
    if (btn) {
        const item_raw = btn.getAttribute("data-item");
        if (item_raw) {
            const item_untyped = JSON.parse(decodeURIComponent(item_raw));
            const following = (btn.getAttribute("data-is-followed") || "false") === "true";
            if (item_untyped.user_id) {
                if (following) {
                    unfollowStream(item_untyped.user_id);
                } else {
                    followStream(item_untyped as StreamLocal);
                }
            } else {
                if (following) {
                    unfollowGame(item_untyped.id);
                } else {
                    followGame(item_untyped as Game);
                }
            }
            btn.setAttribute("data-is-followed", (!following).toString())
        }
    }
}

document.addEventListener("click", function(e: Event) {
    gameAndStreamFollow(e.target as HTMLElement)

    const btn = (e.target as HTMLElement).closest(".menu-item, .btn-close");
    if (btn?.classList.contains("menu-item")) {
        let new_state = btn.getAttribute("data-menu-item") as SidebarState || "closed";
        const is_expanded = btn.getAttribute("aria-expanded") || "false";
        if (is_expanded === "true") {
            new_state = "closed"
        }
        sb_state.set(new_state);
    } else if (btn?.classList.contains("btn-close")) {
        sb_state.set("closed");
    }
});

const form_search = document.querySelector("form")!;
const input_search = form_search.querySelector("#game_name")!;

form_search.addEventListener("input", function(e: Event) {
    e.preventDefault();
    search_value.set((e.target as HTMLInputElement).value);
});

input_search.addEventListener("focus", function(e: Event) {
    sb_state.set("search");
    search_value.set((e.target as HTMLInputElement).value);
});

input_search.addEventListener("blur", function(e: Event) {
    if ((e.target as HTMLInputElement).value.length === 0) {
        sb_state.set("closed")
    }
});


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
};

function initUserVideoTypeFilter(elem: Element) {
    const fieldset = elem.querySelector(".filter-video-type");
    const output_list = elem.querySelector(".output-list");
    const general = settings.get().general;
    for (const which of ["archive", "upload", "highlight"]) {
        const key = `video-${which}s` as keyof typeof general;
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
    updateLiveUsers();
    removeOldProfileImages();
};
window.addEventListener("DOMContentLoaded", startup);



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

function resetFilter() {
    if (g_sheet === null) return;
    g_sheet.deleteRule(0)
}

// TODO: use hx-on:* instead?
window.filterItems = pageFilter;
window.resetFilter = resetFilter;


function initFilter(root: Element) {
    const search_form = root.querySelector(".search-form")!;
    g_sheet = (search_form.insertAdjacentElement('afterend', document.createElement('style')) as HTMLStyleElement).sheet;
}


function handlePathChange(e: Event) {
    const target = e.target as Element;
    const hx_link = target.closest("a[hx-push-url]");
    current_pathname.set(hx_link?.getAttribute("hx-push-url") || null);
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
            // clearStreams();
        } else if (t.classList.contains("js-clear-profiles")) {
            // clearProfiles();
        } else if (t.classList.contains("js-clear-all")) {
            clearGames();
            // clearStreams();
            // clearProfiles();
        }
    })
}

function initGeneralSettings(root:  Element) {
    const general = settings.get().general;
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
        let new_settings = {} as SettingsGeneral;
        // @ts-ignore
        (new FormData(elem)).forEach(function(value, key){ new_settings[key] = value });
        settings.setKey("general", new_settings);
    }
}

function initCategorySettings(root:  Element) {
    const options = root.querySelectorAll("#lang-list option");
    const lang_map = new Map();
    // @ts-ignore
    for (let opt of options) {
        lang_map.set(opt.getAttribute("lang-code")!, opt.value)
    }

    for (const lang of settings.get().category.languages) {
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
        let curr = settings.get().category;
        curr.languages = f_data.getAll("lang") as string[];
        curr.show_all = f_data.get("all-languages") as any;
        settings.setKey("category", curr);
    }
}

