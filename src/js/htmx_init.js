import { games, API_URL, categoryUrl, twitchCatImageSrc, streams, user_images, state, settings, getUrlObject } from './common'
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
        const json = JSON.parse(text);
        let result = "";
        
        const tmpl_img_link = /** @type {HTMLLinkElement} */
          (tmpl.content.querySelector(".game-img-link"));
        const tmpl_img = /** @type {HTMLImageElement} */
          (tmpl.content.querySelector(".game-img"));
        const tmpl_link = /** @type {HTMLLinkElement} */
          (tmpl.content.querySelector(".game-link"));
        const tmpl_name = /** @type {HTMLParagraphElement} */
          (tmpl_link.querySelector("p"));
        const tmpl_external = /** @type {HTMLLinkElement} */
          (tmpl.content.querySelector(".external-link"));
        const tmpl_follow = /** @type {HTMLButtonElement} */
          (tmpl.content.querySelector(".button-follow"));

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
            tmpl_follow.setAttribute("data-is-followed", games.isFollowed(item.id).toString());

            result += tmpl.innerHTML;
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
        state.update_page_title(item.name);
        const btn_load = /** @type {Element} */ (document.querySelector(".btn-load-more"));
        btn_load.setAttribute("hx-vals", JSON.stringify({game_id: item.id}));
        htmx.trigger(btn_load, "click", {})

        const tmpl_heading = /** @type {HTMLHeadingElement} */
          (tmpl.content.querySelector("h2"));
        const tmpl_img = /** @type {HTMLImageElement} */
          (tmpl.content.querySelector("img"));
        const tmpl_external = /** @type {HTMLLinkElement} */
          (tmpl.content.querySelector(".action-box > a"));
        const tmpl_follow = /** @type {HTMLButtonElement} */
          (tmpl.content.querySelector(".button-follow"));

        tmpl_heading.textContent = item.name;
        tmpl_img.src = twitchCatImageSrc(item.box_art_url, config.image.category.width, config.image.category.height);
        tmpl_external.href = "https://www.twitch.tv/directory/game/" + encodeURIComponent(item.name);
        tmpl_follow.setAttribute("data-item-id", item.id);
        tmpl_follow.setAttribute("data-item", encodeURIComponent(JSON.stringify(item)));
        tmpl_follow.setAttribute("data-is-followed", games.isFollowed(item.id).toString());

        return tmpl.innerHTML;
      } else if (path === "/helix/streams") {
        const json = JSON.parse(text);
        let result = "";

        const tmpl_list_item = /** @type {HTMLLIElement} */
          (tmpl.content.querySelector("li"));
        const tmpl_user_link = /** @type {HTMLLinkElement} */
          (tmpl_list_item.querySelector(".user-link"));
        const tmpl_user_img = /** @type {HTMLImageElement} */
          (tmpl_user_link.querySelector("img"));
        const tmpl_user_count = /** @type {HTMLParagraphElement} */
          (tmpl_user_link.querySelector(".user-count"));
        const tmpl_user_title = /** @type {HTMLParagraphElement} */
          (tmpl_user_link.querySelector(".stream-title p"));

        const tmpl_user_info = /** @type {HTMLDivElement} */
          (tmpl.content.querySelector(".user-info"));
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
            tmpl_user_count.textContent = item.viewer_count;

            tmpl_external.href = `https://www.twitch.tv/${item.user_login}/videos`;
            tmpl_info_link.textContent = item.user_name;
            tmpl_info_link.href = video_url;
            tmpl_info_link.setAttribute("hx-push-url", video_url);

            tmpl_info_img_link.href = video_url;
            tmpl_info_img_link.setAttribute("hx-push-url", video_url);
            tmpl_info_img.src = profile_img_url;

            tmpl_follow.setAttribute("data-item-id", item.user_id);
            tmpl_follow.setAttribute("data-item", item_json);
            tmpl_follow.setAttribute("data-is-followed", streams.store.hasId(user_id).toString());

            result += tmpl.innerHTML;
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

        const item = json.data[0];
        state.update_page_title(item.display_name);
        const btn = /** @type {Element} */ (document.querySelector(".btn-load-more"));
        btn.setAttribute("hx-vals", `{"user_id": "${item.id}"}`);
        htmx.ajax('get', '/helix/videos', {source:'.btn-load-more'})
        const item_json = encodeURIComponent(JSON.stringify({
           user_id: item.id,
           user_login: item.login,
           user_name: item.display_name,
        }));

        tmpl_live.setAttribute("data-stream-id", item.id);
        tmpl_heading.textContent = item.display_name;
        tmpl_img.src = item.profile_image_url;
        tmpl_external.href = `https://www.twitch.tv/${item.login}/videos`;

        tmpl_follow.setAttribute("data-item-id", item.id);
        tmpl_follow.setAttribute("data-item", item_json);
        tmpl_follow.setAttribute("data-is-followed", streams.store.hasId(item.id).toString());
        

        return tmpl.innerHTML;
      } else if (path === "/helix/videos") {
        /** @type {Record<string, string>} */
        const VIDEO_ICONS = {
          archive: "video-camera",
          upload: "video-upload",
          highlight: "video-reel",
        }

        const json = JSON.parse(text);

        const tmpl_video = /** @type {HTMLLIElement} */
          (tmpl.content.querySelector(".video"));
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

        
        let result = "";
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
              
            result += tmpl.innerHTML
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
