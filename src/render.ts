import { mainContent, config } from 'config';
import { twitchCatImageSrc } from './common';
import { followed_games } from './games';
import { add_images, profile_images } from './streams';

export function gamesRender(json: any): string {
    let result = "";
    const tmpl = (document.querySelector("#category-header-template") as HTMLTemplateElement);
    const item = json.data[0];
    result += `<title>${json.data[0].name} | Twitch Pages</title>`;
    const img_url = twitchCatImageSrc(item.box_art_url, config.image.category.width, config.image.category.height);
    const game_obj_str = encodeURIComponent(JSON.stringify(item));
    result += "<div>";
    result += tmpl.innerHTML
      .replaceAll(":game_name", item.name)
      .replace(":item_id", item.id)
      .replace("#game_img_url", img_url)
      .replace(":item_json", game_obj_str)
      .replace("#twitch_link", "https://www.twitch.tv/directory/game/" + encodeURIComponent(item.name));
    result += "</div>";

    if (followed_games.get().some((game) => game.id === item.id)) {
       result = result.replace('data-is-followed="false"', 'data-is-followed="true"');
    }

    return result;
}

export function streamsRender(json: any): string {
    const tmpl = document.querySelector("#category-streams-template") as HTMLTemplateElement;
    let result = "<ul>";
    let user_ids = [];
    const imgs = profile_images.get()["images"]
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
          .replaceAll(":item_id", user_id)
          .replace("#user_img", profile_img_url);
        result += html;
    }
    result += "</ul>";

    if (user_ids.length > 0) {
      add_images.set(user_ids);
    }

    return result;
}

function getVideoImageSrc(url: string, width: number, height: number): string {
  return url.replace('%{width}', width.toString()).replace('%{height}', height.toString())
}

function twitchDurationToString(duration: string): string {
    const time = duration.slice(0,-1).split(/[hm]/).reverse()
    const hours = (time.length >= 3) ? `${time[2]}:` : ""
    const minutes = (time.length >= 2) ? `${time[1].padStart(2, "0")}:` : ""
    const seconds = (time.length >= 1) ? time[0].padStart(2, "0") : ""
    return `${hours}${minutes}${seconds}`
}

function twitchDateToString(d: Date): string {
    const round = (nr: number): number => {
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

