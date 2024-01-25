import { games, live, renderUserLiveness, streams } from './common';
import { current_pathname } from './global';
import { clearProfiles, initProfileImages } from './streams';
import { twitch } from './twitch';
import { initSidebarScroll, sb_state } from './sidebar';
import { initHtmx } from "./htmx_init";
import { settings_default } from 'config';

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
        const game = live.users[stream_id];
        if (game) {
            renderUserLiveness(stream_id, elem_card);
        } else {
            live.addUser(stream_id);
        }
    } else if (elem.id === "page-user") {
        initFilter(elem);
        initUserVideoTypeFilter(elem);
    } else if (elem.id === "page-category") {
        initFilter(elem);
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
    if (btn) {
        const item_raw = btn.getAttribute("data-item");
        if (item_raw) {
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
        sb_state.set(new_state);
    } else if (btn?.classList.contains("btn-close")) {
        sb_state.set("closed");
    }
});

/**
@param {Element} elem
*/
function initUserVideoTypeFilter(elem) {
    const fieldset = elem.querySelector(".filter-video-type");
    const output_list = elem.querySelector(".output-list");
    const general = settings.data.general;
    for (const which of ["archive", "upload", "highlight"]) {
        const key = /** @type {keyof typeof general} */ (`video-${which}s`);
        const check_value = !!general[key];
        const input = /** @type {HTMLInputElement} */ (fieldset?.querySelector(`#check-${which}`));
        input.checked = check_value;
        if (check_value === false) {
            output_list?.classList.add(`no-${which}s`);
        }
    }

    fieldset?.addEventListener("click", (e) => {
        const elem = /** @type {HTMLInputElement} */ (e.target);
        if (elem.nodeName === "INPUT") {
            if (elem.checked) {
                output_list?.classList.remove(`no-${elem.value}s`);
            } else {
                output_list?.classList.add(`no-${elem.value}s`);
            }
        }
    })
}

async function startup() {
    await twitch.fetchToken();
    initHtmx();
    document.body.addEventListener("mousedown", handlePathChange)
    initSidebarScroll();
    live.updateLiveUsers();
    initProfileImages();
};
window.addEventListener("DOMContentLoaded", startup);

/** @type {CSSStyleSheet | null} */
let g_sheet = null;

/** @param {string} value */
function pageFilter(value) {
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
// @ts-ignore
window.filterItems = pageFilter;
// @ts-ignore
window.resetFilter = resetFilter;


/** @param {Element} root */
function initFilter(root) {
    const search_form = /** @type {Element} */ (root.querySelector(".search-form"));
    g_sheet = /** @type {HTMLStyleElement} */ (search_form.insertAdjacentElement('afterend', document.createElement('style'))).sheet;
}

/** @param {Event} e */
function handlePathChange(e) {
    const target = /** @type {Element} e */ (e.target);
    const hx_link = target.closest("a[hx-push-url]");
    current_pathname.set(hx_link?.getAttribute("hx-push-url") || null);
}

class Settings extends EventTarget {
    /**
      @typedef {typeof this.data.general} SettingsGeneral
    */

    data = {
        /** @type {{show_all: string, languages: string[]}} */
        category: { show_all: 'on', languages: [] },
        general: {
          "top-games-count": settings_default.top_games_count,
          "category-count": settings_default.streams_count,
          "user-videos-count": settings_default.user_videos_count,
          "video-archives": 'on',
          "video-uploads": false,
          "video-highlights": false,
        }
    }

    /** @type {{
            root: Element
            lang?: {
                list: Element
                tmpl: HTMLTemplateElement
            }
        }} 
    */
    $ = {
        root: document.body
    }

    constructor() {
        super();
        this.localStorageKey = "settings"
        window.addEventListener("storage", () => {
            this._readStorage();
            this._save();
        }, false);
        this.lang_map = new Map();
    }

    _readStorage() {
        const raw = window.localStorage.getItem(this.localStorageKey);
        if (raw) {
            this.data = JSON.parse(raw);
        }
    }
    
    _save() {
        window.localStorage.setItem(this.localStorageKey, JSON.stringify(this.data));
        this.dispatchEvent(new CustomEvent('settings:save'));
    }

    _initCache() {
        this.$.root.querySelector(".js-cache-list")?.addEventListener("click", (e) => {
            const t = /** @type {Element} root */ (e.target);
            if (t.classList.contains("js-clear-games")) {
                games.clear();
            } else if (t.classList.contains("js-clear-streams")) {
                streams.clear();
            } else if (t.classList.contains("js-clear-profiles")) {
                clearProfiles();
            } else if (t.classList.contains("js-clear-all")) {
                games.clear();
                streams.clear();
                clearProfiles();
            }
        })
    }

    
    _initGeneral() {
        const general = settings.data.general;
        for (const key in general) {
            // @ts-ignore
            const value = general[key];
            const input = /** @type {HTMLInputElement | undefined} */ (this.$.root.querySelector(`#${key}`));
            if (input) {
                if (input.type === "number") {
                    input.value = value;
                } else if (input.type === "checkbox") {
                    input.checked = value === "on";
                }
            }
        }

        this.$.root.querySelector("#settings-general")?.addEventListener("submit", (e) => {
            e.preventDefault();
            const elem = /** @type {HTMLFormElement} */ (e.target);
            let new_settings = /** @type {SettingsGeneral} */ ({});
            // @ts-ignore
            (new FormData(elem)).forEach(function(value, key){ new_settings[key] = value });
            this.data["general"] = new_settings;
        });
    }

    _updateElements() {
        const list = /** @type {Element} */ (this.$.root.querySelector(".enabled-languages"));
        this.$.lang = {
            list: list,
            tmpl: /** @type {HTMLTemplateElement} */ (list.querySelector("template")),
        }
    }

    /** @param {Element | undefined} $root */
    init($root) {
        if ($root && $root !== this.$.root) {
            this.$.root = $root
        }
        this._updateElements();
        settings._initCategory();
        settings._initGeneral();
        settings._initCache();
    }

    _initCategory() {
        const options = this.$.root.querySelectorAll("#lang-list option");
        for (let i = 0; i < options.length; i++) {
            const opt = /** @type {HTMLInputElement} */ (options[i]);
            this.lang_map.set(/** @type {string} */ (opt.getAttribute("lang-code")), opt.value)
        }

        for (const lang of this.data.category.languages) {
            this._addLang(lang);
        }
        this._hasLanguages();

        // add events
        const form_category = /** @type {Element} */ (this.$.root.querySelector("#form-category"));
        form_category.addEventListener("submit", (evt) => {
            evt.preventDefault();
            const f_data = new FormData(/** @type {HTMLFormElement} */ (evt.target));
            this.data.category.languages = /** @type {string[]} */ (f_data.getAll("lang"));
            this.data.category.show_all = /** @type {string} */ (f_data.get("all-languages"));
        });

        form_category.addEventListener("click", (event) => {
            const elem = /** @type {HTMLButtonElement} */ (event.target); 
            if (elem.nodeName === "BUTTON") {
              if (elem.classList.contains("add-lang")) {
                this._addLangFromInput(/** @type {HTMLInputElement} */ (elem.previousElementSibling));
              } else if (elem.classList.contains("remove-lang")) {
                  const li = /** @type {Element} */ (elem.closest("li"));
                  li.remove();
              }
            }
        });

        form_category.addEventListener("keydown", (event) => {
            const elem = /** @type {HTMLInputElement} */ (event.target); 
            if (elem.nodeName === "INPUT" && elem.id === "pick-lang") {
                this._addLangFromInput(elem);
            }
        });
    }

    /** @param {string} lang */
    _addLang(lang) {
        if (!this.$.lang) { return; }
      const new_elem = /** @type {Element} */ (this.$.lang.tmpl.content.firstElementChild?.cloneNode(true));
      const input = /** @type {HTMLInputElement} */ (new_elem.querySelector("input"));
      const p = /** @type {HTMLParagraphElement} */ (new_elem.querySelector("p"));
      const text = this.lang_map.get(lang);
      if (text) {
          p.textContent =  text;
          input.setAttribute("value", lang)
          this.$.lang.list.append(new_elem);
      }
    }

    _hasLanguages() {
        if (!this.$.root || !this.$.lang) { return; }
        const msg_elem = /** @type {Element} */ (this.$.root.querySelector(".js-languages-msg"));
        if (this.$.lang.list.querySelectorAll(":scope > li").length > 0) {
            msg_elem.classList.add("hidden")
        } else {
            msg_elem.classList.remove("hidden")
        }
    }

    /** @param {HTMLInputElement} input */
    _addLangFromInput(input) {
        const lang_value = input.value;
        if (lang_value) {
            const opt = document.querySelector(`option[value=${lang_value}]`)
            if (opt && !document.querySelector(`input[value=${lang_value}]`)) { 
              this._addLang(/** @type {string} */ (opt.getAttribute("lang-code")));
              input.value = "";
              this._hasLanguages();
            }
        }
    }
}

export const settings = new Settings();
