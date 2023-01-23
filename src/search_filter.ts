import { act } from "@artalar/act";


export const filter_value = act("");
export const filter_stylesheet = act<CSSStyleSheet | null>(null);

let style_timeout = 0
filter_value.subscribe((value) => {
    clearTimeout(style_timeout);
    const sheet = filter_stylesheet();
    if (sheet === null) {
        return;
    }
    style_timeout = window.setTimeout(() => {
        if (sheet.cssRules.length > 0) {
            sheet.deleteRule(0)
        }
        value = value.trim()
        if (value.length > 0) {
            sheet.insertRule(`.output-list > :not(li[data-title*='${encodeURIComponent(value)}' i]) { display: none !important }`, 0);
        }
    }, 100);
})
