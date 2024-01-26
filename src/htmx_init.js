import { games, API_URL, categoryUrl, twitchCatImageSrc, streams, user_images } from './common'
import { state } from './global';
import { settings } from './main';
import { mainContent, config } from 'config';
import { Twitch } from './twitch';

// @ts-ignore
const htmx = /** @type {import("htmx.org")} */ (window.htmx);

export function initHtmx() {
  htmx.defineExtension("twitch-api", {
    /**
    @param {string} name
    @param {CustomEvent} evt
    */
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
          state.setPath(null)
        } else if (url.pathname === "/helix/streams") {
          evt.detail.parameters["first"] = settings.data.general["category-count"]
          if (!settings.data.category.show_all) {
            evt.detail.parameters["language"] = settings.data.category.languages;
          }
        } else if (url.pathname === "/helix/users") {
          const path = state.path || location.pathname;
          const path_arr = path.split("/")
          evt.detail.parameters["login"] = decodeURIComponent(path_arr[1]);
          state.setPath(null)
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
    },
    /**
    @param {string} text
    @param {any} xhr
    @param {HTMLElement} _elt
    @returns {string}
    */
    transformResponse: function(text, xhr, _elt) {
      // console.log(text, xhr, _elt);
      const pathUrl = new URL(xhr.responseURL)
      const path = pathUrl.pathname;

      const attr = /** @type {string} */ (_elt.getAttribute("hx-template"));
      const tmpl = document.querySelector(attr);
      if (!tmpl) {
        console.warn("Htmx extension 'twitch-api' could not find attribute 'hx-template' in element ", _elt);
        return text;
      }

      if (path === "/helix/games/top") {
        const json = JSON.parse(text);
        let result = "";
        for (const item of json.data) {
            const game_url = categoryUrl(item.name)
            const img_url = twitchCatImageSrc(item.box_art_url, config.image.category.width * 2, config.image.category.height * 2);
            const game_obj_str = encodeURIComponent(JSON.stringify(item));
            let html = tmpl.innerHTML
              .replaceAll("#game_url", game_url)
              .replace(":game_name_text", item.name)
              .replace("#game_external_url", categoryUrl(item.name, true))
              .replace("#game_img_url", img_url)
              .replace(":item_id", item.id)
              .replace(":item_json", game_obj_str)
            if (games.isFollowed(item)) {
               html = html.replace('data-is-followed="false"', 'data-is-followed="true"');
            }
            result += html;
        }
        const cursor = json.pagination.cursor;
        const btn = /** @type {Element} */ (document.querySelector(".btn-load-more"));
        if (cursor) {
          btn.setAttribute("hx-vals", `{"after": "${cursor}"}`);
        } else {
          btn.removeAttribute("hx-vals");
        }
        return result;
      } else if (path === "/helix/games") {
        const json = JSON.parse(text);
        if (xhr.status !== 200 || json.data.length === 0) {
          const pathArr = location.pathname.split("/")
          return `
            <h2>${decodeURIComponent(pathArr[pathArr.length - 1])}</h2>
            <div id="feedback" hx-swap-oob="true">Game/Category not found</div>
          `;
        }

        const item = json.data[0];
        document.title = `${item.name} | Twitch Pages`;
        const btn_load = /** @type {Element} */ (document.querySelector(".btn-load-more"));
        btn_load.setAttribute("hx-vals", JSON.stringify({game_id: item.id}));
        htmx.trigger(btn_load, "click", {})
        const img_url = twitchCatImageSrc(item.box_art_url, config.image.category.width, config.image.category.height);
        const game_obj_str = encodeURIComponent(JSON.stringify(item));
        let result = tmpl.innerHTML
          .replaceAll(":game_name", item.name)
          .replace(":item_id", item.id)
          .replace("#game_img_url", img_url)
          .replace(":item_json", game_obj_str)
          .replace("#twitch_link", "https://www.twitch.tv/directory/game/" + encodeURIComponent(item.name));

        if (games.isFollowed(item.id)) {
           result = result.replace('data-is-followed="false"', 'data-is-followed="true"');
        }

        return result;
      } else if (path === "/helix/streams") {
        const json = JSON.parse(text);
        let result = "";
        const imgs = user_images.data.images;
        let user_ids = [];
        for (const item of json.data) {
            const user_id = item.user_id;
            let profile_img_url = imgs[user_id]?.url;
            if (!profile_img_url) {
              user_ids.push(user_id);
              profile_img_url = `#${user_id}`;
            }
            const video_url = mainContent['user-videos'].url.replace(":user-videos", item.user_login)
            const img_url = twitchCatImageSrc(item.thumbnail_url, config.image.video.width, config.image.video.height);
            const title = item.title.replaceAll('"', "&quot;");
            const item_json = encodeURIComponent(JSON.stringify({
               user_id: user_id,
               user_login: item.user_login,
               user_name: item.user_name,
            }));
            let html = tmpl.innerHTML
              .replaceAll("#video_url", video_url)
              .replaceAll(":user_login", item.user_login)
              .replaceAll(":user_name", item.user_name)
              .replace(":title_encoded", encodeURIComponent(item.title))
              .replaceAll(":title", title)
              .replace(":viewer_count", item.viewer_count)
              .replace("#video_img_url", img_url)
              .replace(":item_json", item_json)
              .replace(":item_id", user_id)
              .replace("#user_img", profile_img_url);
            if (streams.isFollowed(user_id)) {
               html = html.replace('data-is-followed="false"', 'data-is-followed="true"');
            }
            result += html;
        }

        if (user_ids.length > 0) {
          user_images.add(user_ids);
        }
        
        const cursor = json.pagination.cursor;
        const btn = /** @type {Element} */ (document.querySelector(".btn-load-more"));
        if (cursor) {
          const hx_vals = JSON.parse(btn.getAttribute("hx-vals") || "{}");
          hx_vals.after = cursor;
          btn.setAttribute("hx-vals", JSON.stringify(hx_vals));
        } else {
          btn.removeAttribute("hx-vals");
        }
        return result;
      } else if (path === "/helix/users") {
        // const content_type: string = xhr.getResponseHeader("content-type");
        const json = JSON.parse(text);
        if (xhr.status !== 200 || json.data.length === 0) {
          const pathArr = location.pathname.split("/")
          return `
            <h2>${decodeURIComponent(pathArr[1])}</h2>
            <div id="feedback" hx-swap-oob="true">User not found</div>
          `;
        }

        const item = json.data[0];
        document.title = `${item.display_name} | Twitch Pages`;
        const btn = /** @type {Element} */ (document.querySelector(".btn-load-more"));
        btn.setAttribute("hx-vals", `{"user_id": "${item.id}"}`);
        htmx.ajax('GET', '/helix/videos', {source:'.btn-load-more'})
        const item_json = encodeURIComponent(JSON.stringify({
           user_id: item.id,
           user_login: item.login,
           user_name: item.display_name,
        }));
        let result = "";
        result += tmpl.innerHTML
          .replaceAll(":user_login", item.login)
          .replaceAll(":user_display_name", item.display_name)
          .replaceAll("#user_profile_image_url", item.profile_image_url)
          .replace("#twitch_link", `https://www.twitch.tv/${item.login}/videos`)
          .replace(":item_json", item_json)
          .replaceAll(":item_id", item.id);

        if (streams.isFollowed(item.id)) {
           result = result.replace('data-is-followed="false"', 'data-is-followed="true"');
        }

        return result;
      } else if (path === "/helix/videos") {
        /** @type {Record<string, string>} */
        const VIDEO_ICONS = {
          archive: "video-camera",
          upload: "video-upload",
          highlight: "video-reel",
        }

        const json = JSON.parse(text);
        const tmpl = /** @type {HTMLTemplateElement} */ (document.querySelector("#user-video-template"));
        let result = "";
        /** @type {Record<string, number>} */
        const counts = { archive: 0, upload: 0, highlight: 0 };
        for (const item of json.data) {
            counts[item.type] += 1;
            const img_url = getVideoImageSrc(item.thumbnail_url, config.image.video.width, config.image.video.height);
            const date = new Date(item.published_at)
            const title = item.title.replaceAll('"', "&quot;");
            result += tmpl.innerHTML
              .replaceAll(":video_title", title)
              .replace(":video_type", item.type)
              .replace("#video_url", item.url)
              .replace(":video_duration_str", twitchDurationToString(item.duration))
              .replace(":date_str", date.toString())
              .replace(":video_date_str", twitchDateToString(date))
              .replace(":video_type_title", item.type[0].toUpperCase() + item.type.slice(1))
              .replace("#img_url", img_url)
              .replace(":video_icon", VIDEO_ICONS[item.type])
              .replace(":encoded_video_title", encodeURIComponent(item.title));
        }

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
  htmx.config.useTemplateFragments = true;

  htmx.ajax("GET", getUrlObject(location.pathname).html, "#main")
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

/**
@param {string} newPath
@returns {import("config").UrlResolve}
*/
function getUrlObject(newPath) {
  if (newPath === "/") return mainContent["top-games"]
  let contentKey = "not-found"
  const newDirs = newPath.split("/").filter((path) => path.length > 0)
  for (const key in mainContent) {
    const obj = mainContent[key]
    const dirs = obj.url.split("/").filter((path) => path.length > 0)
    if (dirs.length !== newDirs.length || dirs.length === 0) continue
    let isMatch = true
    for (let i = 0; i < dirs.length; i+=1) {
      const dir = dirs[i]
      if (dir[0] === ":") continue
      if (dir !== newDirs[i]) {
        isMatch = false
        break
      }
    }
    if (isMatch) {
      contentKey = key
      break
    }
  }
  return mainContent[contentKey]
}


