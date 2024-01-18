import { clearGames, followGame, unfollowGame} from './games';
import { current_pathname, settings } from './global';
import { search_value } from './search';
import { unfollowStream, followStream, live_users, addLiveUser, initProfileImages, updateLiveUsers, clearStreams, clearProfiles, renderUserLiveness } from './streams';
import { twitch } from './twitch';
import { initSidebarScroll, sb_state } from './sidebar';
import { initHtmx } from "./htmx_init";

/**
@typedef {import("./global").SettingsGeneral} SettingsGeneral
@typedef {import("./streams").StreamLocal} StreamLocal
@typedef {import("./common").Game} Game
@typedef {import("./sidebar").SidebarState} SidebarState
*/

// TODO: when page is reloaded live count is not right

window.addEventListener("htmx:load", (/** @type {Event} */ e) => {
    const elem = /** @type {Element} */ (e.target);
    if (elem.classList.contains("user-heading-box")) {
        const elem_card = /** @type {Element} */ (elem.querySelector(".js-card-live"));
        const stream_id = /** @type {string} */ (elem_card.getAttribute("data-stream-id"));
        const game = live_users.get()[stream_id];
        if (game) {
            renderUserLiveness(stream_id, elem_card);
        } else {
            addLiveUser(stream_id);
        }
    } else if (elem.id === "page-user") {
        initFilter(elem);
        initUserVideoTypeFilter(elem);
    } else if (elem.id === "page-category") {
        initFilter(elem);
    } else if (elem.id === "page-settings") {
        document.title = "Settings | Twitch Pages";
        initSettings(elem);
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
                    unfollowStream(item_untyped.user_id);
                } else {
                    followStream(/** @type {StreamLocal} */ item_untyped);
                }
            } else {
                if (following) {
                    unfollowGame(item_untyped.id);
                } else {
                    followGame(/** @type {Game} */ item_untyped);
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

const form_search = /** @type {HTMLFormElement} */ (document.querySelector("form"));
const input_search = /** @type {Element} */(form_search.querySelector("#game_name"));

form_search.addEventListener("input", function(e) {
    e.preventDefault();
    search_value.set(/** @type {HTMLInputElement} */ (e.target).value);
});

input_search.addEventListener("focus", function(e) {
    sb_state.set("search");
    search_value.set(/** @type {HTMLInputElement} */ (e.target).value);
});

input_search.addEventListener("blur", function(e) {
    if (/** @type {HTMLInputElement} */ (e.target).value.length === 0) {
        sb_state.set("closed")
    }
});

/**
@param {Element} elem
*/
function initUserVideoTypeFilter(elem) {
    const fieldset = elem.querySelector(".filter-video-type");
    const output_list = elem.querySelector(".output-list");
    const general = settings.get().general;
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
    updateLiveUsers();
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

/** @param {Element} root */
function initSettings(root) {
    initCategorySettings(root);
    initGeneralSettings(root);
    initCacheSettings(root);
}

/** @param {Element} root */
function initCacheSettings(root) {
    root.querySelector(".js-cache-list")?.addEventListener("click", (e) => {
        const t = /** @type {Element} root */ (e.target);
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

/** @param {Element} root */
function initGeneralSettings(root) {
    const general = settings.get().general;
    for (const key in general) {
        // @ts-ignore
        const value = general[key];
        const input = /** @type {HTMLInputElement | undefined} */ (root.querySelector(`#${key}`));
        if (input) {
            if (input.type === "number") {
                input.value = value;
            } else if (input.type === "checkbox") {
                input.checked = value === "on";
            }
        }
    }

    root.querySelector("#settings-general")?.addEventListener("submit", handleFormSubmit);
    
    function handleFormSubmit(/** @type {Event} */ e) {
        e.preventDefault();
        const elem = /** @type {HTMLFormElement} */ (e.target);
        let new_settings = /** @type {SettingsGeneral} */ ({});
        // @ts-ignore
        (new FormData(elem)).forEach(function(value, key){ new_settings[key] = value });
        settings.setKey("general", new_settings);
    }
}

/** @param {Element} root */
function initCategorySettings(root) {
    const options = root.querySelectorAll("#lang-list option");
    /** @type {Map<string, string>} root */
    const lang_map = new Map();
    for (let i = 0; i < options.length; i++) {
        const opt = /** @type {HTMLInputElement} */ (options[i]);
        lang_map.set(/** @type {string} */ (opt.getAttribute("lang-code")), opt.value)
    }

    for (const lang of settings.get().category.languages) {
        addLang(lang);
    }
    hasLanguages();
    
    const form_category = /** @type {Element} */ (root.querySelector("#form-category"));
    form_category.addEventListener("submit", handleFormSubmit);
    form_category.addEventListener("click", handleFormClick);
    form_category.addEventListener("keydown", handleFormKeydown);

    /** @param {string} lang */
    function addLang(lang) {
      const ul = /** @type {Element} */ (document.querySelector(".enabled-languages"));
      const tmpl = /** @type {HTMLTemplateElement} */ (ul.querySelector("template"));
      const new_elem = /** @type {Element} */ (tmpl.content.firstElementChild?.cloneNode(true));
      const input = /** @type {HTMLInputElement} */ (new_elem.querySelector("input"));
      const p = /** @type {HTMLParagraphElement} */ (new_elem.querySelector("p"));
      p.textContent = lang_map.get(lang) || "";
      input.setAttribute("value", lang)
      ul.append(new_elem);
    }

    function hasLanguages() {
        const msg_elem = /** @type {Element} */ (root.querySelector(".js-languages-msg"));
        if (root.querySelectorAll(".enabled-languages > li").length > 0) {
            msg_elem.classList.add("hidden")
        } else {
            msg_elem.classList.remove("hidden")
        }
    }

    /** @param {Event} event */
    function handleFormKeydown(event) {
        const elem = /** @type {HTMLInputElement} */ (event.target); 
        if (elem.nodeName === "INPUT" && elem.id === "pick-lang") {
            addLangFromInput(elem);
        }
    }

    /** @param {HTMLInputElement} input */
    function addLangFromInput(input) {
        const lang_value = input.value;
        if (lang_value) {
            const opt = document.querySelector(`option[value=${lang_value}]`)
            if (opt && !document.querySelector(`input[value=${lang_value}]`)) { 
              addLang(/** @type {string} */ (opt.getAttribute("lang-code")));
              input.value = "";
              hasLanguages();
            }
        }
    }
    
    /** @param {Event} event */
    function handleFormClick(event) {
        const elem = /** @type {HTMLButtonElement} */ (event.target); 
        if (elem.nodeName === "BUTTON") {
          if (elem.classList.contains("add-lang")) {
            addLangFromInput(/** @type {HTMLInputElement} */ (elem.previousElementSibling));
          } else if (elem.classList.contains("remove-lang")) {
              const li = /** @type {Element} */ (elem.closest("li"));
              li.remove();
          }
        }
    }
   
    /** @param {Event} event */
    function handleFormSubmit(event) {
        event.preventDefault();
        const elem = /** @type {HTMLFormElement} */ (event.target);
        const f_data = new FormData(elem);
        let curr = settings.get().category;
        curr.languages = /** @type {string[]} */ (f_data.getAll("lang"));
        curr.show_all = /** @type {string} */ (f_data.get("all-languages"));
        settings.setKey("category", curr);
    }
}
