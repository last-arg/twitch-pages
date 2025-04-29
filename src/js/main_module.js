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
import { getUrlObject } from "./util";

console.log("datastar module4", ds)

const event_name = "datastar_plugin:push_url";
const plugin_push_url = {
    type: PluginType.Action,
    name: 'push_url',
    fn: (ctx) => {
        const url = new URL(ctx.el.href);
        history.pushState({}, '', url)
        dispatchEvent(new CustomEvent(event_name, {
          detail: url
        }));
    },
}

const u = new URL("https://www.google.com");
console.log(URL.prototype.isPrototypeOf(u));

/** @param {CustomEvent<URL>} ev */
async function handle_push_url(ev) {
  const main = document.querySelector("#main");
  if (main === null) { return; }

  console.assert(URL.prototype.isPrototypeOf(ev.detail), "Event.detail has to be URL object");
  const url_obj = getUrlObject(ev.detail.pathname);
  const res = await fetch(url_obj.html);
  const html_raw = await res.text();
  main.innerHTML = html_raw;
}

window.addEventListener(event_name, handle_push_url);

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
  plugin_push_url
);

ds.apply();


