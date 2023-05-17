import { mainContent, config } from 'config';
import { twitchCatImageSrc } from './common';
import { games } from './games';
import { add_profiles, profiles, streams } from './streams';

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

    // if (games.some((game) => game.id === item.id)) {
    //    result = result.replace('data-is-followed="false"', 'data-is-followed="true"');
    // }

    return result;
}

export function topGamesRender(json: any): string {
    const tmpl = document.querySelector("#top-games-template") as HTMLTemplateElement;
    let result = "<ul>";
    for (const item of json.data) {
        const url_name = encodeURIComponent(item.name);
        const game_url = mainContent['category'].url.replace(":category", url_name)
        const img_url = twitchCatImageSrc(item.box_art_url, config.image.category.width * 2, config.image.category.height * 2);
        const game_obj_str = encodeURIComponent(JSON.stringify(item));
        let html = tmpl.innerHTML
          .replaceAll("#game_url", game_url)
          .replace(":game_name_text", item.name)
          .replace(":game_name_url", url_name)
          .replace("#game_img_url", img_url)
          .replace(":item_id", item.id)
          .replace(":item_json", game_obj_str)

        if (games.some((game) => game.id === item.id)) {
           html = html.replace('data-is-followed="false"', 'data-is-followed="true"');
        }
        result += html;
    }
    result += "</ul>";
    return result;
}

export function streamsRender(json: any): string {
    const tmpl = document.querySelector("#category-streams-template") as HTMLTemplateElement;
    let result = "<ul>";
    let user_ids = [];
    for (const item of json.data) {
        const user_id = item.user_id;
        let profile_img_url = profiles[user_id]?.url;
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
        if (streams.some((stream) => stream.user_id === user_id)) {
           html = html.replace('data-is-followed="false"', 'data-is-followed="true"');
        }
        result += html;
    }
    result += "</ul>";

    if (user_ids.length > 0) {
      add_profiles(user_ids);
    }

    console.log(result)
    return result;
}

export function usersRender(json: any): string {
    const tmpl = (document.querySelector("#user-header-template") as HTMLTemplateElement);
    const item = json.data[0];
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

    if (streams.some((stream) => stream.user_id === item.id)) {
       result = result.replace('data-is-followed="false"', 'data-is-followed="true"');
    }
    
    return result;
}
