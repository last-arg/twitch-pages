import * as ds from "@starfederation/datastar";
import {
    // DOM
    Attr, Bind, Class, On, Ref, Show, Text,
    // Browser
    Clipboard, CustomValidity, OnIntersect, OnInterval, OnLoad, OnSignalChange, Persist, ReplaceUrl, ScrollIntoView, ViewTransition,
    // Logic
    Fit, SetAll, ToggleAll
} from "@starfederation/datastar/plugins";
import { PluginType } from "@starfederation/datastar/types";
import { getUrlObject, twitchCatImageSrc, encodeHtml, categoryUrl, getVideoImageSrc, twitchDurationToString, twitchDateToString } from "./util";
import { twitch } from "./twitch.js";
import { config, mainContent, settings_default, partials_cache_version } from './config.prod';
import { games, init_common, live, streams } from "./common.js";

/**
@typedef {import("@starfederation/datastar/types").ActionPlugin} ActionPlugin
@typedef {import("@starfederation/datastar/types").RuntimeContext} RuntimeContext
*/

/** @ts-ignore */
window.global_store = {
    /** @ts-ignore */
    settings_default: {
        /** @type {{show_all: string|null, languages: string[]}} */
        category: { show_all: 'on', languages: [] },
        general: {
            "top_games_count": settings_default.top_games_count,
            "category_count": settings_default.streams_count,
            "user_videos_count": settings_default.user_videos_count,
            "show_archives": true,
            "show_uploads": false,
            "show_highlights": false,
        }
    },
    /**
      @param {RuntimeContext} ctx
      @param {KeyboardEvent} evt
    */
    addLanguage: function(ctx, evt) {
        if (evt.type === "keydown" && evt.key !== "Enter") {
            return;
        }
        const el = /** @type {HTMLInputElement} */ (document.querySelector("#pick-lang"));
        if (!el) {
            return;
        }
        const value = el.value;
        if (!value) {
            return;
        }
        const opt = document.querySelector(`option[value=${value}]`)
        if (!opt) {
            return;
        }
        const lang_code = opt.getAttribute("lang-code")
        if (!lang_code) {
            return;
        }

        const s = ctx.signals.signal("settings.category.languages")
        if (!s) {
            return;
        }
        if (s.value.includes(lang_code)) {
            evt.target.value = "";
            console.warn("Enter valid language")
            return;
        }
        s.value.push(lang_code);
        s.value = [...s.value];
    },
    /**
      @param {RuntimeContext} ctx
    */
    renderLanguages(ctx) {
        const langs = ctx.signals.value("settings.category.languages")
        if (!langs) {
            return;
        }
        const tmpl = document.querySelector("#tmpl-lang");
        const li = tmpl.content.querySelector("li");
        const p = li.querySelector("p");
        const input = li.querySelector("input");
        const frag = new DocumentFragment();
        for (const lang of langs) {
            const option = document.querySelector(`[lang-code=${lang}]`);
            p.textContent = option?.value || lang;
            input.value = lang;
            frag.appendChild(li.cloneNode(true))
        }
        const ul = document.querySelector(".enabled-languages");
        ul?.replaceChildren(frag)
    },

    /**
      @param {RuntimeContext} ctx
      @param {Event} evt
    */
    removeLanguage(ctx, evt) {
        const btn = evt.target?.closest(".remove-lang");
        if (!btn) {
            return;
        }
        const li = btn.closest("li");
        const input = li.querySelector("input")
        const s = ctx.signals.signal("settings.category.languages");
        const langs = [...s.value]
        const idx = langs.indexOf(input.value);
        if (idx === -1) {
            return;
        }
        langs.splice(idx, 1)
        s.value = langs;
    }
};

/** @type {RuntimeContext | undefined} */
let datastar_ctx = undefined;

const push_url_event_name = "datastar_plugin:push_url";
/** @type {ActionPlugin} */
const plugin_push_url = {
    type: PluginType.Action,
    name: 'push_url',
    fn: (ctx) => {
        if (datastar_ctx === undefined) {
            datastar_ctx = ctx;
        }
        let url = undefined;
        /** @ts-ignore */
        const input = ctx.el.href;
        if (input) {
            url = URL.parse(input, location.origin)
        }

        if (!url) {
            console.error(`Failed to resolve url path value '${input}'`, ctx.el);
            return;
        }

        history.pushState({}, '', url)
        dispatchEvent(new CustomEvent(push_url_event_name, {
            detail: { url: url, ctx: ctx }
        }));
    },
}


/** @type {number} */
let replace_state_timeout = 0;

document.addEventListener("profile_images:render", function() {
    const content = document.getElementById("main")?.innerHTML;
    if (!content) {
        return;
    }
    clearTimeout(replace_state_timeout)
    replace_state_timeout = window.setTimeout(function() {
        history.replaceState({ content_main: content }, '')
    }, 700)
});

/** @param {PopStateEvent} ev */
window.addEventListener("popstate", function(ev) {
    const state_content = ev.state.content_main;
    if (state_content) {
        const main = document.getElementById("main");
        if (!main) {
            return;
        }
        datastar_removals()
        main.innerHTML = state_content;

        // This is needed if user left page before images were fetched and rendered
        const img_ids = Array.from(main.querySelectorAll("img[data-user-id]"))
            .map((el) => el.dataset.userId);
        streams.user_images.render_and_fetch_images(img_ids);
    } else {
        window.location.reload();
    }
});

function datastar_removals() {
    if (datastar_ctx === undefined) { return; }

    for (const [id] of datastar_ctx.removals.entries()) {
        const selector = `header #${id}`;
        if (!document.querySelector(selector)) {
            datastar_ctx.removals.delete(id);
        }
    }
}

const TWITCH_API_URL = "https://api.twitch.tv"

/** @type {ActionPlugin} */
const plugin_twitch = {
    type: PluginType.Action,
    name: 'twitch',
    fn: async (ctx, req_type) => {
        let replace_url = false;
        if (req_type === "games/top") {
            const info = el_to_info(ctx.el);
            if (!info.tmpl) { return; }
            const tmpl_el = info.tmpl;
            const target = info.target;
            const merge_mode = info.merge_mode;

            ctx.el.setAttribute("aria-disabled", "true");

            const count = ctx.signals.value("settings.general.top_games_count") || settings_default.top_games_count;
            let url = `${TWITCH_API_URL}/helix/games/top?first=${count}`;
            const req_data_raw = ctx.el.dataset.reqData;
            if (req_data_raw) {
                const req_data = JSON.parse(req_data_raw);
                if (req_data.after) {
                    url += `&after=${req_data.after}`;
                }
            }

            const res = await twitch.twitchFetch(url);
            const json = await res.json();

            const btn = /** @type {Element} */ (document.querySelector(".btn-load-more"));
            if (!btn) {
                console.error("Failed to find <button> with selector '.btn-load-more'");
                return;
            }

            const cursor = json.pagination.cursor;
            if (json.data.length == 0) {
                btn.removeAttribute("data-req-data");
                return;
            }

            const frag = new DocumentFragment();

            const tmpl_item = /** @type {HTMLLIElement} */
                (tmpl_el.content.querySelector("li"))
            const tmpl_img_link = /** @type {HTMLLinkElement} */
                (tmpl_item.querySelector(".game-img-link"));
            const tmpl_img = /** @type {HTMLImageElement} */
                (tmpl_item.querySelector(".game-img"));
            const tmpl_link = /** @type {HTMLLinkElement} */
                (tmpl_item.querySelector(".game-link"));
            const tmpl_name = /** @type {HTMLParagraphElement} */
                (tmpl_link.querySelector("p"));
            const tmpl_external = /** @type {HTMLLinkElement} */
                (tmpl_item.querySelector(".external-link"));
            const tmpl_follow = /** @type {HTMLButtonElement} */
                (tmpl_item.querySelector(".button-follow"));

            for (const item of json.data) {
                const game_url = categoryUrl(item.name)
                tmpl_link.href = game_url;
                tmpl_img_link.href = game_url;
                tmpl_name.textContent = item.name;
                tmpl_external.href = categoryUrl(item.name, true);
                tmpl_img.src = twitchCatImageSrc(item.box_art_url, config.image.category.width * 2, config.image.category.height * 2);
                tmpl_follow.setAttribute("data-item-id", item.id);
                tmpl_follow.setAttribute("data-item", encodeURIComponent(JSON.stringify(item)));
                tmpl_follow.setAttribute("data-is-followed", games.isFollowed(item.id).toString());

                frag.appendChild(tmpl_item.cloneNode(true));
            }

            if (merge_mode === "append") {
                target.appendChild(frag);
            } else if (merge_mode === "replace") {
                target.replaceWith(frag);
            } else {
                console.error(`Invalid merge mode '${merge_mode}'`);
            }

            if (cursor) {
                btn.setAttribute("aria-disabled", "false");
                btn.setAttribute("data-req-data", `{"after": "${cursor}"}`);
            } else {
                btn.removeAttribute("data-req-data");
            }

            replace_url = true;
        } else if (req_type === "games") {
            const path_arr = location.pathname.split("/");
            console.assert(path_arr.length > 1, "Array can't not be empty");
            const name = path_arr[path_arr.length - 1];
            if (name.length === 0) {
                console.warn(`There no Category/Game name. Current location pathname: ${location.pathname}`);
                return;
            }

            const info = el_to_info(ctx.el);
            if (!info.tmpl) { return; }
            const tmpl_el = info.tmpl;
            const target_el = info.target;

            var url = `${TWITCH_API_URL}/helix/games?name=${name}`;
            const res = await twitch.twitchFetch(url)
            const json = await res.json();

            if (json.data.length == 0) {
                // @ts-ignore
                document.getElementById("main").innerHTML = `
              <h2>${decodeURIComponent(name)}</h2>
              <div id="feedback">Game/Category not found</div>
            `;
                return;
            }

            const item = json.data[0];
            change_page_title(item.name);

            const btn = document.querySelector(".btn-load-more");
            if (!btn) {
                console.error("No '.btn-load-more' element")
                return;
            }

            // Will start fetching live streams
            btn.setAttribute("data-req-data", JSON.stringify({ game_id: item.id, }));
            btn.click();

            const tmpl_heading = /** @type {HTMLHeadingElement} */
                (tmpl_el.content.querySelector("h2"));
            const tmpl_img = /** @type {HTMLImageElement} */
                (tmpl_el.content.querySelector("img"));
            const tmpl_external = /** @type {HTMLLinkElement} */
                (tmpl_el.content.querySelector(".action-box > a"));
            const tmpl_follow = /** @type {HTMLButtonElement} */
                (tmpl_el.content.querySelector(".button-follow"));

            tmpl_heading.textContent = item.name;
            tmpl_img.src = twitchCatImageSrc(item.box_art_url, config.image.category.width, config.image.category.height);
            tmpl_external.href = "https://www.twitch.tv/directory/game/" + encodeURIComponent(item.name);
            tmpl_follow.setAttribute("data-item-id", item.id);
            tmpl_follow.setAttribute("data-item", encodeURIComponent(JSON.stringify(item)));
            tmpl_follow.setAttribute("data-is-followed", games.isFollowed(item.id).toString());

            target_el.replaceWith(tmpl_el.content)
            replace_url = true;
        } else if (req_type === "streams") {
            await fetch_twitch_streams(ctx)
            replace_url = true;
        } else if (req_type === "users") {
            const info = el_to_info(ctx.el);
            if (!info.tmpl) { return; }

            const path = location.pathname;
            const path_arr = path.split("/")
            if (path_arr.length === 0 && path_arr[1].length === 0) {
                console.error(`User page has invalid url path '${path}'`);
                return;
            }
            const name = path_arr[1];

            const url = `${TWITCH_API_URL}/helix/users?login=${name}`;
            const res = await twitch.twitchFetch(url)
            const json = await res.json();

            if (json.data.length == 0) {
                // @ts-ignore
                document.getElementById("main").innerHTML = `
                <h2>${decodeURIComponent(name)}</h2>
                <div id="feedback">User not found</div>
              `;
                return;
            }

            const item = json.data[0];

            change_page_title(item.display_name);

            // Start fetching user videos
            const btn = /** @type {HTMLElement} */ (document.querySelector(".btn-load-more"));
            btn.setAttribute("data-req-data", JSON.stringify({
                user_id: item.id,
            }));
            btn.click();

            const tmpl = info.tmpl;
            const tmpl_live = /** @type {HTMLDivElement} */
                (tmpl.content.querySelector(".js-card-live"));
            const tmpl_external = /** @type {HTMLLinkElement} */
                (tmpl.content.querySelector("a[rel=external]"));
            const tmpl_follow = /** @type {HTMLButtonElement} */
                (tmpl.content.querySelector(".button-follow"));
            const tmpl_img = /** @type {HTMLImageElement} */
                (tmpl.content.querySelector("img"));
            const tmpl_heading = /** @type {HTMLHeadingElement} */
                (tmpl.content.querySelector("h2"));

            tmpl_live.setAttribute("data-stream-id", item.id);
            const game = live.store.users[item.id];
            if (game) {
                tmpl_live.classList.remove("hidden");
                const tmpl_link = tmpl_live.querySelector("a");
                tmpl_link.textContent = game;
                tmpl_link.href = `/directory/category/${encodeURIComponent(game)}`;
            }

            tmpl_heading.textContent = item.display_name;
            tmpl_img.src = item.profile_image_url;
            tmpl_external.href = `https://www.twitch.tv/${item.login}/videos`;

            tmpl_follow.setAttribute("data-item-id", item.id);
            const item_json = encodeURIComponent(JSON.stringify({
                user_id: item.id,
                user_login: item.login,
                user_name: item.display_name,
            }));
            tmpl_follow.setAttribute("data-item", item_json);
            tmpl_follow.setAttribute("data-is-followed", streams.store.hasId(item.id).toString());

            info.target.replaceWith(tmpl.content);
            replace_url = true;
        } else if (req_type === "videos") {
            await fetch_twitch_videos(ctx)
            replace_url = true;
        }

        if (replace_url) {
            const content = document.getElementById("main").innerHTML;
            history.replaceState({ content_main: content }, '')
        }
    },
}

/**
@param {HTMLOrSVGElement} el
@returns {Info}
*/
function el_to_info(el) {
    let tmpl = undefined;
    const tmpl_sel = el.dataset.template;
    if (tmpl_sel) {
        const tmpl_el = document.querySelector(tmpl_sel);
        if (tmpl_el) {
            tmpl = tmpl_el;
        } else {
            console.warn(`Failed to find <template> with selector ${tmpl_sel}`)
        }
    } else {
        console.error(`Failed to find data-template in`, el);
    }

    let target = el;
    const target_sel = el.dataset.target;
    if (target_sel) {
        const target_el = document.querySelector(target_sel);
        if (target_el) {
            target = target_el;
        } else {
            console.warn(`Failed to find element with selector ${target_sel}`)
        }
    }

    return {
        tmpl: tmpl,
        target: target,
        merge_mode: get_merge_mode(el.dataset.mergeMode),
    }
}

/**
@param {string | undefined} raw
@returns {'append' | 'replace'}
*/
function get_merge_mode(raw) {
    /** @type {'append' | 'replace' } */
    let result = "append";
    if (raw && raw.length > 0) {
        if (raw !== "append" && raw !== "replace") {
            throw `Invalid merge mode value '${raw}'. Valid values: 'append', 'replace'`
        }

        result = /** @type {'append' | 'replace' } */(raw);
    }

    return result;
}

/**
@param {RuntimeContext} ctx
*/
async function fetch_twitch_videos(ctx) {
    let user_id = undefined;
    let cursor_opt = undefined;

    const req_data_raw = ctx.el.dataset.reqData;
    if (req_data_raw) {
        const req_data = JSON.parse(req_data_raw);
        user_id = req_data.user_id;
        cursor_opt = req_data.after;
    }

    if (!user_id) {
        console.error(`Failed to find 'user_id' value from 'data-req-data'.`, ctx.el);
        return;
    }

    const info = el_to_info(ctx.el);

    if (!info.tmpl) {
        return;
    }

    // NOTE: so datastar inits/runs element's datastar attributes
    // Won't init/run attributes if ids are same.
    // This removes the ids from list. So elements will be initialized again.
    ctx.removals.delete("check-archive")
    ctx.removals.delete("check-upload")
    ctx.removals.delete("check-highlight")

    const count = ctx.signals.value("settings.general.user_videos_count") || settings_default.user_videos_count;
    var url = `${TWITCH_API_URL}/helix/videos?user_id=${user_id}&first=${count}`;
    if (cursor_opt) {
        url += `&after=${cursor_opt}`;
    }
    const res = await twitch.twitchFetch(url)
    const json = await res.json();

    const btn = /** @type {Element} */ (document.querySelector(".btn-load-more"));
    const cursor = json.pagination.cursor;

    if (json.data.length == 0) {
        btn.removeAttribute("data-req-data")
        return;
    }

    const tmpl_video = /** @type {HTMLLIElement} */
        (info.tmpl.content.querySelector(".video"));
    const tmpl_link = /** @type {HTMLLinkElement} */
        (tmpl_video.querySelector(".video-link"));
    const tmpl_img = /** @type {HTMLImageElement} */
        (tmpl_link.querySelector("img"));
    const tmpl_title = /** @type {HTMLDivElement} */
        (tmpl_video.querySelector(".video-title"));
    const tmpl_title_p = /** @type {HTMLParagraphElement} */
        (tmpl_title.querySelector("p"));
    const tmpl_type = /** @type {HTMLSpanElement} */
        (tmpl_video.querySelector(".video-type"));
    const tmpl_type_span = /** @type {HTMLSpanElement} */
        (tmpl_type.querySelector("span"));
    const tmpl_type_svg_use = /** @type {HTMLLinkElement} */
        (tmpl_type.querySelector("svg use"));
    const tmpl_duration = /** @type {HTMLDivElement} */
        (tmpl_video.querySelector(".video-duration"));
    const tmpl_duration_str = /** @type {HTMLSpanElement} */
        (tmpl_duration.querySelector("span"));
    const tmpl_duration_date = /** @type {HTMLSpanElement} */
        (tmpl_duration.querySelector("span[title]"));


    /** @type {Record<string, string>} */
    const VIDEO_ICONS = {
        archive: "video-camera",
        upload: "video-upload",
        highlight: "video-reel",
    }

    let frag = new DocumentFragment();

    /** @type {Record<string, number>} */
    const counts = { archive: 0, upload: 0, highlight: 0 };

    for (const item of json.data) {
        counts[item.type] += 1;
        const img_url = getVideoImageSrc(item.thumbnail_url, config.image.video.width, config.image.video.height);
        const date = new Date(item.published_at)
        const title = encodeHtml(item.title);

        tmpl_video.setAttribute("data-video-type", item.type);
        tmpl_video.setAttribute("data-title", encodeURIComponent(item.title));

        tmpl_link.href = item.url;
        tmpl_link.title = title;
        tmpl_img.src = img_url;

        tmpl_title_p.textContent = title;
        tmpl_type.title = item.type[0].toUpperCase() + item.type.slice(1);
        tmpl_type_span.textContent = item.type;
        const icon_url = tmpl_type_svg_use.getAttribute("href")?.replace(":video_icon", VIDEO_ICONS[item.type]) || "#";
        tmpl_type_svg_use.setAttribute("href", icon_url);

        tmpl_duration_str.textContent = twitchDurationToString(item.duration);
        tmpl_duration_date.title = date.toString();
        tmpl_duration_date.textContent = twitchDateToString(date);

        frag.appendChild(tmpl_video.cloneNode(true));
    }

    info.target.appendChild(frag);

    if (cursor) {
        btn.setAttribute("aria-disabled", "false");
        btn.setAttribute("data-req-data", JSON.stringify({
            user_id: user_id,
            after: cursor,
        }));
    } else {
        btn.removeAttribute("data-req-data");
    }

    ctx.signals.setValue("archive", video_type_count("archive"));
    ctx.signals.setValue("upload", video_type_count("upload"));
    ctx.signals.setValue("highlight", video_type_count("highlight"));
}

/**
@param {string} video_type
@returns {number}
*/
function video_type_count(video_type) {
    return document.querySelectorAll(`[data-video-type=${video_type}]`).length;
}


/**
@param {RuntimeContext} ctx
*/
async function fetch_twitch_streams(ctx) {
    const info = el_to_info(ctx.el);
    if (!info?.tmpl) {
        return;
    }
    let game_id = undefined;
    let cursor_opt = undefined;

    const req_data_raw = ctx.el.dataset.reqData;
    if (req_data_raw) {
        const req_data = JSON.parse(req_data_raw);
        game_id = req_data.game_id;
        cursor_opt = req_data.after;
    }

    if (!game_id) {
        console.error(`Failed to find 'game_id' value from 'data-req-data'.`, ctx.el);
        return;
    }

    ctx.el.setAttribute("aria-disabled", "true");

    const tmpl_el = info.tmpl;
    const target_el = info.target;

    const count = ctx.signals.value("settings.general.category_count") || settings_default.streams_count;
    var url = `${TWITCH_API_URL}/helix/streams?game_id=${game_id}&first=${count}`;
    if (cursor_opt) {
        url += `&after=${cursor_opt}`;
    }
    const res = await twitch.twitchFetch(url)
    const json = await res.json();

    const btn = /** @type {Element} */ (document.querySelector(".btn-load-more"));
    if (!btn) {
        console.error("Failed to find <button> with selector '.btn-load-more'");
        return;
    }

    const cursor = json.pagination.cursor;
    if (json.data.length == 0) {
        btn.removeAttribute("data-req-data")
        return;
    }

    const tmpl_list_item = /** @type {HTMLLIElement} */
        (tmpl_el.content.querySelector("li"));
    const tmpl_user_link = /** @type {HTMLLinkElement} */
        (tmpl_list_item.querySelector(".user-link"));
    const tmpl_user_img = /** @type {HTMLImageElement} */
        (tmpl_user_link.querySelector("img"));
    const tmpl_user_count = /** @type {HTMLParagraphElement} */
        (tmpl_user_link.querySelector(".user-count"));
    const tmpl_user_title = /** @type {HTMLParagraphElement} */
        (tmpl_user_link.querySelector(".stream-title p"));

    const tmpl_user_info = /** @type {HTMLDivElement} */
        (tmpl_el.content.querySelector(".user-info"));
    const tmpl_external = /** @type {HTMLLinkElement} */
        (tmpl_user_info.querySelector(".external-video"));
    const tmpl_follow = /** @type {HTMLButtonElement} */
        (tmpl_user_info.querySelector(".button-follow"));
    const tmpl_info_link = /** @type {HTMLLinkElement} */
        (tmpl_user_info.querySelector(".user-info-link"));
    const tmpl_info_img_link = /** @type {HTMLLinkElement} */
        (tmpl_user_info.querySelector(".user-info-img-link"));
    const tmpl_info_img = /** @type {HTMLImageElement} */
        (tmpl_info_img_link.querySelector("img"));

    const frag = new DocumentFragment();
    let user_ids = [];

    for (const item of json.data) {
        const user_id = item.user_id;
        const video_url = mainContent['user-videos'].url.replace(":user-videos", item.user_login)
        const img_url = twitchCatImageSrc(item.thumbnail_url, config.image.video.width, config.image.video.height);
        const item_json = encodeURIComponent(JSON.stringify({
            user_id: user_id,
            user_login: item.user_login,
            user_name: item.user_name,
        }));
        tmpl_list_item.setAttribute("data-title", encodeURIComponent(item.title));
        tmpl_user_link.href = "https://twitch.tv/" + item.user_login;
        tmpl_user_link.title = encodeHtml(item.title);
        tmpl_user_img.src = img_url;
        tmpl_user_title.textContent = item.title;
        tmpl_user_count.textContent = item.viewer_count + " viewers";

        tmpl_external.href = `https://www.twitch.tv/${item.user_login}/videos`;
        tmpl_info_link.textContent = item.user_name;
        tmpl_info_link.href = video_url;

        tmpl_info_img_link.href = video_url;

        user_ids.push(user_id);
        tmpl_info_img.setAttribute("data-user-id", user_id);

        tmpl_follow.setAttribute("data-item-id", item.user_id);
        tmpl_follow.setAttribute("data-item", item_json);
        tmpl_follow.setAttribute("data-is-followed", streams.store.hasId(user_id).toString());

        frag.appendChild(tmpl_list_item.cloneNode(true));
    }

    target_el.appendChild(frag);

    if (user_ids.length > 0) {
        dispatchEvent(new CustomEvent("user_image:render", {
            detail: user_ids,
        }))
    }

    if (cursor) {
        btn.setAttribute("aria-disabled", "false");
        btn.setAttribute("data-req-data", JSON.stringify({
            game_id: game_id,
            after: cursor,
        }));
    } else {
        btn.removeAttribute("data-req-data");
    }
}

/** @param {CustomEvent<URL>} ev */
async function handle_push_url(ev) {
    /** @ts-ignore */
    const pathname = ev.detail.url.pathname;
    /** @ts-ignore */
    const ctx = ev.detail.ctx;

    if (pathname === "/settings") {
        ctx.removals.delete("top-games-count")
        ctx.removals.delete("category-count")
        ctx.removals.delete("user-videos-count")
        ctx.removals.delete("video-archives")
        ctx.removals.delete("video-uploads")
        ctx.removals.delete("video-highlights")
    }

    change_main(pathname)
}

/** @ts-ignore */
window.addEventListener(push_url_event_name, handle_push_url);

/** @param {string} pathname */
async function change_main(pathname) {
    const main = document.querySelector("#main");
    if (!main) {
        console.error("Missing element with id '#main'");
        return;
    }

    const url_obj = getUrlObject(pathname);
    const res = await fetch(url_obj.html + "?cache_version=" + partials_cache_version, { cache: "force-cache" });
    const html_raw = await res.text();
    main.innerHTML = html_raw;
    change_page_title(undefined);
    if (url_obj.url === "/settings") {
        history.replaceState({ content_main: html_raw }, '')
    }
}

/** @param {string | undefined} str */
function change_page_title(str) {
    let title = "";
    if (live.count > 0) {
        title += `(${live.count}) `;
    }

    if (location.pathname === "/") {
        title += "Home";
    } else if (location.pathname === "/settings") {
        title += "Settings";
    } else if (str === "not-found") {
        title += "Not Found";
    } else if (str) {
        title += str;
    } else {
        return;
    }

    title += " | Twitch Pages"
    document.title = title.trimStart();
}

window.addEventListener("DOMContentLoaded", async function() {
    await twitch.fetchToken();
    init_common();
    change_main(location.pathname);
})

document.addEventListener("click", function(/** {Event} */e) {
    const target = /** @type {HTMLElement} */ (e.target);
    gameAndStreamFollow(target)
});

/**
@param {HTMLElement} t
*/
function gameAndStreamFollow(t) {
    const btn = t.closest(".button-follow");
    if (!btn) { return; }

    const item_raw = btn.getAttribute("data-item");
    if (!item_raw) { return; }

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
}

ds.load(
    // DOM
    Attr, Bind, Class, On, Ref, Show, Text,
    // Browser
    Clipboard, CustomValidity, OnIntersect, OnInterval, OnLoad, OnSignalChange, Persist, ReplaceUrl, ScrollIntoView, ViewTransition,
    // Logic
    Fit, SetAll, ToggleAll,
    // Custom
    plugin_push_url, plugin_twitch,
);

ds.apply();
