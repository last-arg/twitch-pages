import { mainContent, config } from 'config';
import { twitchCatImageSrc } from './common';
import { games } from './games';

export function topGamesRender(content: string): string {
    const json = JSON.parse(content);
    const tmpl = document.querySelector("#top-games-template") as HTMLTemplateElement;
    // let result = "<ul id='output-list'>";

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
    const cursor = json.pagination.cursor;
    const btn = document.querySelector(".btn-load-more");
    if (cursor) {
        btn?.setAttribute("aria-disabled", "false");
        btn?.setAttribute("ts-data", "after=" + cursor);
    } else {
        btn?.setAttribute("aria-disabled", "true");
        btn?.setAttribute("ts-data", "");
    }
    return result;
}
