import * as htmx from "htmx.org/dist/htmx";
globalThis.htmx = htmx;
// @ts-ignore
import { Idiomorph } from "../node_modules/idiomorph/dist/idiomorph.esm";
globalThis.Idiomorph = Idiomorph;
// @ts-ignore
// Make sure this is loaded after making htmx global (window/globalThis)
require("htmx.org/dist/ext/preload");
