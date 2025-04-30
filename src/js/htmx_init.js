import { games, API_URL, categoryUrl, twitchCatImageSrc, streams, user_images, state, settings } from './common'
import { getUrlObject } from './util'
import { mainContent, config } from './config.prod';
import { Twitch } from './twitch';

export function initHtmx() {
  htmx.config.selfRequestsOnly = false;
  htmx.config.refreshOnHistoryMiss = true;
  // @ts-ignore
  htmx.defineExtension("twitch-api", {
    onEvent: (name, evt) => {
      // console.log(name, evt)
      if (name === "htmx:configRequest") {
        const path = evt.detail.path;
        const url = new URL(path, API_URL)
        evt.detail.path = url.toString();
        evt.detail.headers = Twitch.headers;

        if (url.pathname === "/helix/games/top") {
          evt.detail.parameters["first"] = settings.data.general["top-games-count"]
        } else if (url.pathname === "/helix/games") {
          const path = state.path || location.pathname;
          const path_arr = path.split("/")
          evt.detail.parameters["name"] = decodeURIComponent(path_arr[path_arr.length - 1]);
        } else if (url.pathname === "/helix/streams") {
          evt.detail.parameters["first"] = settings.data.general["category-count"]
          if (!settings.data.category.show_all) {
            evt.detail.parameters["language"] = settings.data.category.languages;
          }
        } else if (url.pathname === "/helix/users") {
          const path = state.path || location.pathname;
          const path_arr = path.split("/")
          evt.detail.parameters["login"] = decodeURIComponent(path_arr[1]);
        } else if (path === "/helix/videos") {
          evt.detail.parameters["first"] = settings.data.general["user-videos-count"]
        }
      } else if (name === "htmx:beforeRequest") {
        const btn = document.querySelector(".btn-load-more");
        if (btn) {
          btn.setAttribute("aria-disabled", "true");
        }
      } else if (name === "htmx:afterOnLoad") {
        const btn = document.querySelector(".btn-load-more");
        if (btn) {
          btn.setAttribute("aria-disabled", "false");
        }
      }
      return true;
    },
    transformResponse: function(text, xhr, _elt) {
      // console.log(text, xhr, _elt);
      const pathUrl = new URL(xhr.responseURL)
      const path = pathUrl.pathname;

      const attr = /** @type {string} */ (_elt.getAttribute("hx-template"));
      const tmpl = /** @type {HTMLTemplateElement} */ (document.querySelector(attr));
      if (!tmpl) {
        console.warn("Htmx extension 'twitch-api' could not find attribute 'hx-template' in element ", _elt);
        return text;
      }

      if (path === "/helix/games/top") {
        throw "DONE: /helix/games/top";
      } else if (path === "/helix/games") {
        throw "DONE: /helix/games";
      } else if (path === "/helix/users") {
        throw "DONE: /helix/users";
      } else if (path === "/helix/videos") {
        const json = JSON.parse(text);


        /**
        @param {string} selector
        @param {number} count
        */
        function update_count(selector, count) {
          const elem = /** @type {Element} */ (document.querySelector(selector));
          const new_len_highlight = +(elem.textContent || "") + count;
          elem.textContent = new_len_highlight.toString();
        }

        update_count("#highlights-count", counts.highlight);
        update_count("#uploads-count", counts.upload);
        update_count("#archives-count", counts.archive);
        
        const cursor = json.pagination.cursor;
        const btn_more = /** @type {Element} */ (document.querySelector(".btn-load-more"));
        if (cursor) {
          const obj = JSON.parse(btn_more.getAttribute("hx-vals") || "{}");
          obj.after = cursor;
          btn_more.setAttribute("hx-vals", JSON.stringify(obj));
        } else {
          btn_more.removeAttribute("hx-vals");
        }

        return result;
      }
      return text;
    },
  });

  htmx.ajax("get", getUrlObject(location.pathname).html, "#main")
}

let tmp_elem = document.createElement("p");
/**
@param {string} str
@returns {string}
*/
function encodeHtml(str) {
  tmp_elem.textContent = str;
  return tmp_elem.innerHTML;  
}

/**
@param {string} duration
@returns {string}
*/
function twitchDurationToString(duration) {
  const time = duration.slice(0,-1).split(/[hm]/).reverse()
  const hours = (time.length >= 3) ? `${time[2]}:` : ""
  const minutes = (time.length >= 2) ? `${time[1].padStart(2, "0")}:` : ""
  const seconds = (time.length >= 1) ? time[0].padStart(2, "0") : ""
  return `${hours}${minutes}${seconds}`
}

/**
@param {Date} d
@returns {string}
*/
function twitchDateToString(d) {
  /**
  @param {number} nr
  @returns {number}
  */
  function round(nr) {
    const nr_floor = Math.floor(nr)
    return (nr - nr_floor) > 0.5 ? Math.ceil(nr) : nr_floor;
  }
  const seconds_f = (Date.now() - d.getTime()) / 1000
  const minutes_f = seconds_f / 60
  const hours_f = minutes_f / 60
  const days_f = hours_f / 24
  const minutes = round(minutes_f)
  const hours = round(hours_f)
  const days = round(days_f)
  const weeks = round(days_f / 7)
  const months = round(days_f / 30)
  const years = round(days_f / 365)

  let result_str = "1 minute ago"
  if (years > 0 && months > 11) {
    result_str = (years === 1) ? "1 year ago" : `${years} years ago`
  } else if (months > 0 && weeks > 4) {
    result_str = (months === 1) ? "1 month ago" : `${months} months ago`
  } else if (weeks > 0 && days > 6) {
    result_str = (weeks === 1) ? "1 week ago" : `${weeks} weeks ago`
  } else if (days > 0 && hours > 23) {
    result_str = (days === 1) ? "Yesterday" : `${days} days ago`
  } else if (hours > 0 && minutes > 59) {
    result_str = (hours === 1) ? "1 hour ago" : `${hours} hours ago`
  } else if (minutes > 1) {
    result_str = `${minutes} minutes ago`
  }

  return result_str
}

/**
@param {string} url
@param {number} width
@param {number} height
@returns {string}
*/
function getVideoImageSrc(url, width, height) {
  return url.replace('%{width}', width.toString()).replace('%{height}', height.toString())
}
