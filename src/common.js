import { Games, SearchGames } from "./games";
import { LiveStreams, LiveStreamsStore, Streams, StreamsStore, UserImages } from "./streams";
import { Sidebar } from "./sidebar";
import { settings_default } from 'config';

export const state = {
    /** @type {string | null} */
    path: document.location.pathname,   
    /** @param {string | null} path */
    setPath(path) {
        this.path = path;
    }
}

const live_store = new LiveStreamsStore();
const streams_store = new StreamsStore(live_store);
export const user_images = new UserImages(streams_store);

export const games = new Games();
// NOTE: StreamsStore also contains LiveStreamsStore
export const live = new LiveStreams(streams_store);
export const streams = new Streams(streams_store, live, user_images);

export const game_search = new SearchGames(games);
export const sidebar = new Sidebar();

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

    data = {
        /** @type {{show_all: string, languages: string[]}} */
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
                streams.store.clear();
            } else if (t.classList.contains("js-clear-profiles")) {
                user_images.clear();
            } else if (t.classList.contains("js-clear-all")) {
                games.clear();
                streams.store.clear();
                user_images.clear();
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

class FormFilter extends HTMLElement {
    constructor() {
        super();
        const _this = this;
        this.$ = {
            form: /** @type {HTMLFormElement} */ (this.querySelector(".search-form")),
            /**
              @param {Event} e
            */
            handleSubmit(e) { e.preventDefault(); },
            resetFilter() {
                _this.css_sheet.deleteRule(0)
            },
            /** @param {Event} evt */
            handleInput(evt) {
                if (_this.css_sheet.cssRules.length > 0) {
                    _this.css_sheet.deleteRule(0)
                }
                // @ts-ignore
                const value = /** @type {string} */ (evt.target.value).trim();
                if (value.length > 0) {
                    _this.css_sheet.insertRule(`.output-list > :not(li[data-title*='${encodeURIComponent(value)}' i]) { display: none !important }`, 0);
                }
            },
        }
        const style = document.createElement('style');
        this.insertAdjacentElement('afterend', style);
        this.css_sheet = /** @type {CSSStyleSheet} */ (style.sheet);
    }

    connectedCallback() {
        this.$.form.addEventListener("input", this.$.handleInput);
        this.$.form.addEventListener("submit", this.$.handleSubmit);
        this.$.form.addEventListener("reset", this.$.resetFilter);
    }

    disconnectedCallback() {
        this.$.form.removeEventListener("input", this.$.handleInput);
        this.$.form.removeEventListener("submit", this.$.handleSubmit);
        this.$.form.removeEventListener("reset", this.$.resetFilter);
    }
}

customElements.define("form-filter", FormFilter)

class VideoFilter extends HTMLElement {
    constructor() {
        super();
        const _this = this
        this.$ = {
            output_list: /** @type {HTMLUListElement} */ (document.querySelector(".output-list")),
            /** @param {Event} e */
            handleClick(e) {
                const elem = /** @type {HTMLInputElement} */ (e.target);
                if (elem.nodeName === "INPUT") {
                    if (elem.checked) {
                        _this.$.output_list.classList.remove(`no-${elem.value}s`);
                    } else {
                        _this.$.output_list.classList.add(`no-${elem.value}s`);
                    }
                }
            },
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

        this.addEventListener("click", this.$.handleClick);
    }

    disconnectedCallback() {
        this.removeEventListener("click", this.$.handleClick);
    }
}

customElements.define("filter-video", VideoFilter)
