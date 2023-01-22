import { addGame, games, games_list, game_tmpl, removeGame } from './games';
import { settings, current_path } from './global';
import { search_term, search_results, search_list } from './search';
import { Game, renderGames } from './common';

window.addEventListener("htmx:pushedIntoHistory", (e) => {
    const path = document.location.pathname;
    initPages(path, e.target as Element);
})

initPages(document.location.pathname, document.body);
initHeader(document.body)

function initPages(path: string, target: Element) {
    if (path === "/settings") {
        document.title = "Settings | Twitch Pages";
        initSettings(target);
    } else if (path === "/") {
        initRoot(target);
    }
}

function initHeader(root: Element) {
    // Games
    initHeaderGames(root);

    // Search
    document.querySelector("#game_name")?.addEventListener("input", (e: Event) => {
        search_term((e.target as HTMLInputElement).value);
        search_results();
    })
    search_list.addEventListener("mousedown", handlePathChange);
    search_list.addEventListener("click", handleGameFollow);

    // TODO: Users/Streams
}

function initHeaderGames(_root: Element) {
    renderGames(game_tmpl, games_list, games);
    games_list.addEventListener("mousedown", handlePathChange)
    games_list.addEventListener("click", (e) => {
        const btn = (e.target as Element).closest(".button-follow");
        if (btn) {
            const id = btn.getAttribute("data-game-id")
            if (id ) {
                removeGame(id);
            }
        }
    })
}

function handleGameFollow(e: Event) {  
    const btn = (e.target as Element).closest(".button-follow");
    if (btn) {
        const game_raw = btn.getAttribute("data-game");
        if (game_raw) {
            const game: Game = JSON.parse(decodeURIComponent(game_raw));
            const following = (btn.getAttribute("data-is-followed") || "false") === "true";
            if (following) {
                removeGame(game.id);
            } else {
                addGame(game);
            }
            btn.setAttribute("data-is-followed", (!following).toString())
            return;
        }

        const id = btn.getAttribute("data-game-id")
        if (id ) {
            removeGame(id);
        }
    }
}

function initRoot(root: Element) {
    const main = root.querySelector("#main")!;
    main.addEventListener("mousedown", handlePathChange);
    main.addEventListener("click", handleGameFollow);
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
    // TODO: <button @click="$store.games.clear()"
    // TODO: <button @click="$store.streams.clear()"
    // TODO: <button @click="$store.profile_images.clear()"
    // TODO: @click="$store.games.clear(); $store.streams.clear(); $store.profile_images.clear()"

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
