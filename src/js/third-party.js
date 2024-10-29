globalThis.htmx = require("htmx.org").default;
// @ts-ignore
import { Idiomorph } from "../../node_modules/idiomorph/dist/idiomorph.esm";
globalThis.Idiomorph = Idiomorph;
// @ts-ignore
// Make sure this is loaded after making htmx global (window/globalThis)
require("htmx-ext-preload");
