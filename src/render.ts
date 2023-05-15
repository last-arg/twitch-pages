import { mainContent, config } from 'config';
import { twitchCatImageSrc } from './common';
import { games } from './games';

export function gamesRender(json: any): string {
    let result = "";
    const tmpl = (document.querySelector("#category-header-template") as HTMLTemplateElement);
    const item = json.data[0];
    result += `<title>${json.data[0].name} | Twitch Pages</title>`;
    // document.querySelector("#param-game_id")!.setAttribute("value", item.id);
    // htmx.trigger(".btn-load-more", "click", {})
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
    let result = "<ul id='output-list'>";
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
