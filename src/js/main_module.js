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
import { getUrlObject, twitchCatImageSrc } from "./util";
import { Twitch } from "./twitch.js";
import { config } from './config.prod';

console.log("datastar module4", ds)

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
      console.log("twitch", req_type);
      if (req_type === "games") {
        const path_arr = location.pathname.split("/");
        console.assert(path_arr.length > 1, "Array can't not be empty");
        const name = path_arr[path_arr.length - 1];
        console.log("name", name)
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
        if (!tmpl_el) {
          console.error(`Failed to find html element with selector ${target_id}`)
          return;
        }

        const url = `${TWITCH_API_URL}/helix/games?name=${name}`;
        const res = await fetch(url, { headers: Twitch.headers })
        const json = await res.json();

        if (json.data.length == 0) {
          console.error(`Failed to find category/game '${name}'`)
          return;
        }
        
        const tmpl_heading = /** @type {HTMLHeadingElement} */
          (tmpl_el.content.querySelector("h2"));
        const tmpl_img = /** @type {HTMLImageElement} */
          (tmpl_el.content.querySelector("img"));
        const tmpl_external = /** @type {HTMLLinkElement} */
          (tmpl_el.content.querySelector(".action-box > a"));
        const tmpl_follow = /** @type {HTMLButtonElement} */
          (tmpl_el.content.querySelector(".button-follow"));

        const item = json.data[0];
        tmpl_heading.textContent = item.name;
        tmpl_img.src = twitchCatImageSrc(item.box_art_url, config.image.category.width, config.image.category.height);
        tmpl_external.href = "https://www.twitch.tv/directory/game/" + encodeURIComponent(item.name);
        tmpl_follow.setAttribute("data-item-id", item.id);
        tmpl_follow.setAttribute("data-item", encodeURIComponent(JSON.stringify(item)));
        // TODO:
        // tmpl_follow.setAttribute("data-is-followed", games.isFollowed(item.id).toString());
        
        target_el.innerHTML = tmpl_el.innerHTML;
      }
    },
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


