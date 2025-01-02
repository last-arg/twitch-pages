import { Games, SearchGames } from "./games";
import { LiveStreams, LiveStreamsStore, Streams, StreamsStore, UserImages } from "./streams";
import { Sidebar } from "./sidebar";
import { mainContent, settings_default } from './config.prod';

export const state = {
    /** @type {string} */
    path: document.location.pathname,   

    /** @param {string} path */
    set_page_path(path) {
        if (this.path == path) { return }
        this.path = path;
        this.update_page_title(null);
    },

    /** @param {string | null} title */
    update_page_title(title) {
        let page_title = title;
        if (title === null) {
            const url_obj = getUrlObject(this.path);
            const url = url_obj.url;
            if (url == "/") {
                page_title = "Home";
            } else if (url == "/settings") {
                page_title = "Settings";
            } else if (url == "/not-found") {
                page_title = "Not Found";
            } else {
                return;
            }
        }
        let result = "";
        if (live && live.count > 0) {
            result = `(${live.count}) `;
        }
        result += `${page_title} | Twitch Pages`;
        document.title = result;
    },

    replace_page_title_count() {
        let new_title = "";
        if (live && live.count > 0) {
            new_title += `(${live.count}) `;
        }
        const index = document.title.indexOf(")", 1) + 1;
        new_title += document.title.slice(index).trim();
        document.title = new_title;
    } 
}

/**
@param {string} newPath
@returns {import("./config.prod.js").UrlResolve}
*/
export function getUrlObject(newPath) {
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

/** @type {UserImages} */
export var user_images;
/** @type {Games} */
export var games;
// NOTE: StreamsStore also contains LiveStreamsStore
/** @type {LiveStreams} */
export var live;
/** @type {Streams} */
export var streams;

/** @type {SearchGames} */
export var game_search;
/** @type {Sidebar} */
export var sidebar;

export function init_common() {
    const live_store = new LiveStreamsStore();
    const streams_store = new StreamsStore(live_store);
    user_images = new UserImages(streams_store);

    games = new Games();
    live = new LiveStreams(streams_store);
    streams = new Streams(streams_store, live, user_images);

    game_search = new SearchGames(games);
    sidebar = new Sidebar();
}

/**
@typedef {import("./streams").StreamLocal} StreamLocal
@typedef {"archive" | "upload" | "highlight"} VideoType

@typedef {Object} StreamTwitch
@property {string} user_id
@property {string} game_name
@property {string} type

@typedef {Object} Game
@property {string} name
@property {string} id
@property {string} box_art_url
*/

export const API_URL = "https://api.twitch.tv"

/**
@param {string} url_template
@param {number} width
@param {number} height
@returns {string}
*/
export function twitchCatImageSrc(url_template, width, height) {
    return url_template.replace("{width}", width.toString()).replace("{height}", height.toString());
}


/**
@param {string} name
@returns {(a: any, b: any) => number}
*/
export function strCompareField(name) {
    return (a, b) => {
        return a[name].localeCompare(b[name], undefined, {sensitivity: "base"});
    }
}

/**
@param {string} cat
@param {boolean} is_twitch
@return {string}
*/
export function categoryUrl(cat, is_twitch = false) {
    let result = "";
    if (is_twitch) {
        result += "https://twitch.tv"
    }
    result += "/directory/category/" + encodeURIComponent(cat);
    return result; 
}

class Settings extends EventTarget {
    /**
      @typedef {typeof this.data.general} SettingsGeneral
    */

    static data_default = {
        /** @type {{show_all: string|null, languages: string[]}} */
        category: { show_all: 'on', languages: [] },
        general: {
          "top-games-count": settings_default.top_games_count,
          "category-count": settings_default.streams_count,
          "user-videos-count": settings_default.user_videos_count,
          "video-archives": true,
          "video-uploads": false,
          "video-highlights": false,
        }
    }

    data = Settings.data_default;

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
        window.addEventListener("storage", this, false);
        this._readStorage();
        this.lang_map = new Map();
    }

    /**
      @param {StorageEvent} ev
    */
    handleEvent(ev) {
        if (ev.type === "storage") {
            if (ev.key !== null && ev.key == this.localStorageKey) {
                console.log("Settings: storage happened")
                this._readStorage(ev.newValue);
            }
        }
    }
    
    /**
      @param {string | null} new_val
    */
    _readStorage(new_val) {
        const raw = new_val !== null ? new_val : window.localStorage.getItem(this.localStorageKey);
        if (raw) {
            this.data = JSON.parse(raw);
        } else {
            this.data = Settings.data_default;
        } 
    }
    
    _save() {
        window.localStorage.setItem(this.localStorageKey, JSON.stringify(this.data));
    }

    _initCache() {
        this.$.root.querySelector(".js-cache-list")?.addEventListener("click", (e) => {
            const t = /** @type {Element} root */ (e.target);
            if (t.classList.contains("js-clear-games")) {
                games.clear();
            } else if (t.classList.contains("js-clear-streams")) {
                streams.store.clear();
            } else if (t.classList.contains("js-clear-profiles")) {
                user_images.clear();
            } else if (t.classList.contains("js-clear-all")) {
                games.clear();
                streams.store.clear();
                user_images.clear();
            } else if (t.classList.contains("js-clear-all-and-restore")) {
                const games_backup = [...games.items];
                const streams_backup = [...streams.store.items];
                localStorage.clear();
                games.items = games_backup;
                games._save();
                streams.store.items = streams_backup;
                streams.store._save();
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
                    input.checked = value;
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
            this._save()
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
        this.data.category.languages
        const input_all_langs = /** @type {HTMLInputElement} */ (document.querySelector("input[name=all-languages]"));
        input_all_langs.checked = this.data.category.show_all;
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
            this.data.category.show_all = /** @type {string|null} */ (f_data.get("all-languages"));
            this._save();
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

class FormFilter extends HTMLElement {
    constructor() {
        super();
        this.$ = {
            form: /** @type {HTMLFormElement} */ (this.querySelector(".search-form")),
        }
        const style = document.createElement('style');
        this.insertAdjacentElement('afterend', style);
        this.css_sheet = /** @type {CSSStyleSheet} */ (style.sheet);
    }

    /** @param {Event} ev */
    handleEvent(ev) {
        switch (ev.type) {
        case "submit": {
            ev.preventDefault();
            break;
        }
        case "reset": {
            this.css_sheet.deleteRule(0)
            break;
        }
        case "input": {
            if (this.css_sheet.cssRules.length > 0) {
                this.css_sheet.deleteRule(0)
            }
            // @ts-ignore
            const value = /** @type {string} */ (ev.target.value).trim();
            if (value.length > 0) {
                this.css_sheet.insertRule(`.output-list > :not(li[data-title*='${encodeURIComponent(value)}' i]) { display: none !important }`, 0);
            }
            break;
        }
        }
    }

    connectedCallback() {
        this.$.form.addEventListener("input", this);
        this.$.form.addEventListener("submit", this);
        this.$.form.addEventListener("reset", this);
    }

    disconnectedCallback() {
        this.$.form.removeEventListener("input", this);
        this.$.form.removeEventListener("submit", this);
        this.$.form.removeEventListener("reset", this);
    }
}

customElements.define("form-filter", FormFilter)

class VideoFilter extends HTMLElement {
    constructor() {
        super();
        this.$ = {
            output_list: /** @type {HTMLUListElement} */ (document.querySelector(".output-list")),
        }
    }

    /** @param {Event} ev */
    handleEvent(ev) {
        const elem = /** @type {HTMLInputElement} */ (ev.target);
        if (elem.nodeName === "INPUT") {
            if (elem.checked) {
                this.$.output_list.classList.remove(`no-${elem.value}s`);
            } else {
                this.$.output_list.classList.add(`no-${elem.value}s`);
            }
        }
    }

    connectedCallback() {
        const inputs = this.querySelectorAll("input[type=checkbox][value]");
        for (let i = 0; i < inputs.length; i++) {
            const input = /** @type {HTMLInputElement} */ (inputs[i]);
            const general = settings.data.general;
            const key = /** @type {keyof typeof general} */ (`video-${input.value}s`);
            const val = /** @type {boolean} */ (general[key]);
            if (val) {
                input.checked = val;
            } else {
                this.$.output_list.classList.add(`no-${input.value}s`);
            }
        }

        this.addEventListener("click", this);
    }

    disconnectedCallback() {
        this.removeEventListener("click", this);
    }
}

customElements.define("filter-video", VideoFilter)
