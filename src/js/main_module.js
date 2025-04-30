// import * as ds from "./datastar.js";
import * as ds from "@starfederation/datastar";
import {
// DOM
Attr, Bind, Class, On, Ref, Show, Text, 
// Backend
Indicator, GET, POST, PUT, PATCH, DELETE, MergeFragments, MergeSignals, RemoveFragments, RemoveSignals, ExecuteScript, 
// Browser
Clipboard, CustomValidity, OnIntersect, OnInterval, OnLoad, OnSignalChange, Persist, ReplaceUrl, ScrollIntoView, ViewTransition, 
// Logic
Fit, SetAll, ToggleAll
} from "../../node_modules/@starfederation/datastar/dist/plugins/index.js";
import { PluginType } from "../../node_modules/@starfederation/datastar/dist/engine/types.js";
import { getUrlObject, twitchCatImageSrc, encodeHtml, categoryUrl } from "./util";
import { Twitch } from "./twitch.js";
import { config, mainContent } from './config.prod';

/**
@typedef {import("@starfederation/datastar/dist/engine/types.js").ActionPlugin} ActionPlugin
*/

const push_url_event_name = "datastar_plugin:push_url";
/** @type {ActionPlugin} */
const plugin_push_url = {
    type: PluginType.Action,
    name: 'push_url',
    fn: (ctx) => {
        const url = new URL(ctx.el.href);
        history.pushState({}, '', url)
        dispatchEvent(new CustomEvent(push_url_event_name, {
          detail: url
        }));
    },
}

const TWITCH_API_URL = "https://api.twitch.tv"

/** @type {ActionPlugin} */
const plugin_twitch = {
    type: PluginType.Action,
    name: 'twitch',
    fn: async (ctx, req_type) => {
      if (req_type === "games/top") {
        const tmpl_id = /** @type {string} */ (ctx.el.dataset.template);
        /** @ts-ignore */
        const tmpl_el = document.querySelector(tmpl_id);
        if (!tmpl_el) {
          console.error(`Failed to find <template> with id ${tmpl_id}`)
          return;
        }

        const merge_mode = ctx.el.dataset.mergeMode || "append";
        var target = ctx.el;

        const target_sel = ctx.el.dataset.target;
        if (target_sel) {
            const target_new = document.querySelector(target_sel);
            if (target_new) {
              /** @ts-ignore */
              target = target_new;
            } else {
              console.warn(`Failed to find element with selector '${target_sel}'`);
            }
        }

        ctx.el.setAttribute("aria-disabled", "true");

        // TODO: change first value settings top-games count
        // settings.data.general["top-games-count"]
        var url = `${TWITCH_API_URL}/helix/games/top?first=15`;
        const req_data_raw = ctx.el.dataset.reqData;
        if (req_data_raw) {
          const req_data = JSON.parse(req_data_raw);
          if (req_data.after) {
            url += `&after=${req_data.after}`;
          }
        }
        const res = await fetch(url, { headers: Twitch.headers })
        const json = await res.json();

        const cursor = json.pagination.cursor;
        if (json.data.length == 0) {
          if (cursor) {
            // TODO: no more items to load msg
          } else {
            // TODO: display no games if no cursor
          }
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
            tmpl_link.setAttribute("hx-push-url", game_url);
            tmpl_img_link.href = game_url;
            tmpl_img_link.setAttribute("hx-push-url", game_url);
            tmpl_name.textContent = item.name;
            tmpl_external.href = categoryUrl(item.name, true);
            tmpl_img.src = twitchCatImageSrc(item.box_art_url, config.image.category.width * 2, config.image.category.height * 2);
            tmpl_follow.setAttribute("data-item-id", item.id);
            tmpl_follow.setAttribute("data-item", encodeURIComponent(JSON.stringify(item)));
            // TODO: game is followed
            // tmpl_follow.setAttribute("data-is-followed", games.isFollowed(item.id).toString());
             
            frag.appendChild(tmpl_item.cloneNode(true));
        }

        if (merge_mode === "append") {
          target.appendChild(frag);
        } else if (merge_mode === "replace") {
          target.replaceWith(frag);
        } else {
          console.error(`Invalid merge mode '${merge_mode}'`);
        }

        const btn = /** @type {Element} */ (document.querySelector(".btn-load-more"));
        if (cursor) {
          btn.setAttribute("aria-disabled", "false");
          btn.setAttribute("data-req-data", `{"after": "${cursor}"}`);
        } else {
          btn.removeAttribute("data-req-data");
        }

      } else if (req_type === "games") {
        const path_arr = location.pathname.split("/");
        console.assert(path_arr.length > 1, "Array can't not be empty");
        const name = path_arr[path_arr.length - 1];
        if (name.length === 0) {
          console.warn(`There no Category/Game name. Current location pathname: ${location.pathname}`);
          return;
        }

        const tmpl_id = /** @type {string} */ (ctx.el.dataset.template);
        /** @type {HTMLTemplateElement} */
        const tmpl_el = document.querySelector(tmpl_id);
        if (!tmpl_el) {
          console.error(`Failed to find <template> with id ${tmpl_id}`)
          return;
        }

        const target_id = /** @type {string} */ (ctx.el.dataset.target);
        /** @type {HTMLDivElement} */
        const target_el = document.querySelector(target_id);
        if (!target_el) {
          console.error(`Failed to find html element with selector ${target_id}`)
          return;
        }

        var url = `${TWITCH_API_URL}/helix/games?name=${name}`;
        const req_data_raw = ctx.el.dataset.reqData;
        if (req_data_raw) {
          const req_data = JSON.parse(req_data_raw);
          if (req_data.after) {
            url += `&after=${req_data.after}`;
          }
        }
        const res = await fetch(url, { headers: Twitch.headers })
        const json = await res.json();

        if (json.data.length == 0) {
            // TODO: Category does not exist
            // return `
            //   <h2>${decodeURIComponent(pathArr[pathArr.length - 1])}</h2>
            //   <div id="feedback" hx-swap-oob="true">Game/Category not found</div>
            // `;
            console.error(`Failed to find category/game '${name}'`)
            // TODO: hide load more button
            return;
        }

        const item = json.data[0];
        fetch_twitch_streams(item.id, undefined, undefined, undefined);
        
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
        // TODO:
        // tmpl_follow.setAttribute("data-is-followed", games.isFollowed(item.id).toString());
        
        // TODO: change to replace child
        target_el.innerHTML = tmpl_el.innerHTML;
      } else if (req_type === "streams") {
          const tmpl_id = ctx.el.dataset.template;
          const target_id = ctx.el.dataset.target;
          var game_id = undefined;
          var cursor = undefined;

          const req_data_raw = ctx.el.dataset.reqData;
          if (req_data_raw) {
            const req_data = JSON.parse(req_data_raw);
            game_id = req_data.game_id;
            cursor = req_data.cursor;
          }

          if (!game_id) {
            console.error(`Failed to find 'game_id' value from 'data-req-data'.`, ctx.el);
            return;
          }

          ctx.el.setAttribute("aria-disabled", "true");
          fetch_twitch_streams(game_id, cursor, tmpl_id, target_id)
      }
    },
}

/**
@param {string} game_id
@param {string | undefined} cursor_opt
@param {string | undefined} tmpl_id_opt
@param {string | undefined} target_id_opt
*/
async function fetch_twitch_streams(game_id, cursor_opt, tmpl_id_opt, target_id_opt) {
    const tmpl_id = tmpl_id_opt || "#category-streams-template";
    const tmpl_el_opt = document.querySelector(tmpl_id);
    if (!tmpl_el_opt) {
      console.error(`Failed to find <template> with id ${tmpl_id}`)
      return;
    }
    const tmpl_el = /** @type {HTMLTemplateElement} */ (tmpl_el_opt);
    
    const target_id = target_id_opt || ".output-list";
    const target_el_opt = document.querySelector(target_id);
    if (!target_el_opt) {
      console.error(`Failed to find <ul> with selector '${target_id}'`)
      return;
    }
    /** @type {Element} */
    const target_el = target_el_opt;

    // TODO: change 'first' count
    // settings.data.general["category-count"]
    var url = `${TWITCH_API_URL}/helix/streams?game_id=${game_id}&first=15`;
    if (cursor_opt) {
      url += `&after=${cursor_opt}`;
    }
    const res = await fetch(url, { headers: Twitch.headers })
    const json = await res.json();

    const cursor = json.pagination.cursor;
    if (json.data.length == 0) {
      if (cursor) {
        // TODO: no more items to load msg
      } else {
        // TODO: display no streams msg
      }
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
        const title = encodeHtml(item.title);
        const item_json = encodeURIComponent(JSON.stringify({
         user_id: user_id,
         user_login: item.user_login,
         user_name: item.user_name,
        }));
        tmpl_list_item.setAttribute("data-title", encodeURIComponent(item.title));
        tmpl_user_link.href = "https://twitch.tv/" + item.user_login;
        tmpl_user_link.title = title;
        tmpl_user_img.src = img_url;
        tmpl_user_title.textContent = title;
        tmpl_user_count.textContent = item.viewer_count + " viewers";

        tmpl_external.href = `https://www.twitch.tv/${item.user_login}/videos`;
        tmpl_info_link.textContent = item.user_name;
        tmpl_info_link.href = video_url;
        tmpl_info_link.setAttribute("hx-push-url", video_url);

        tmpl_info_img_link.href = video_url;
        tmpl_info_img_link.setAttribute("hx-push-url", video_url);

        user_ids.push(user_id);
        tmpl_info_img.setAttribute("data-user-id", user_id);

        tmpl_follow.setAttribute("data-item-id", item.user_id);
        tmpl_follow.setAttribute("data-item", item_json);
        // TODO: stream is-followed
        // tmpl_follow.setAttribute("data-is-followed", streams.store.hasId(user_id).toString());
         
        frag.appendChild(tmpl_list_item.cloneNode(true));
    }

    target_el.appendChild(frag);

    if (user_ids.length > 0) {
      dispatchEvent(new CustomEvent("user_image:render", {
          detail: user_ids,
      }))
    }

    const btn = /** @type {Element} */ (document.querySelector(".btn-load-more"));
    if (!btn) {
        console.error("Failed to find <button> with selector '.btn-load-more'");
        return;
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
  const main = document.querySelector("#main");
  if (!main) { return; }

  console.assert(URL.prototype.isPrototypeOf(ev.detail), "Event.detail has to be URL object");
  const url_obj = getUrlObject(ev.detail.pathname);
  const res = await fetch(url_obj.html);
  const html_raw = await res.text();
  main.innerHTML = html_raw;
}

window.addEventListener(push_url_event_name, handle_push_url);

ds.load(
  // DOM
  Attr, Bind, Class, On, Ref, Show, Text, 
  // Backend
  Indicator, GET, POST, PUT, PATCH, DELETE, MergeFragments, MergeSignals, RemoveFragments, RemoveSignals, ExecuteScript, 
  // Browser
  Clipboard, CustomValidity, OnIntersect, OnInterval, OnLoad, OnSignalChange, Persist, ReplaceUrl, ScrollIntoView, ViewTransition, 
  // Logic
  Fit, SetAll, ToggleAll,
  // Custom
  plugin_push_url, plugin_twitch,
);

ds.apply();


