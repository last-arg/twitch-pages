import { act } from "@artalar/act";
import { renderStreams, strCompareField, TWITCH_MAX_QUERY_COUNT } from "./common";


export type StreamLocal = {user_id: string, user_login: string, user_name: string};

const key_streams = "streams"

export const streams_list = document.querySelector(".js-streams-list")!;
export const stream_tmpl = (streams_list?.nextElementSibling! as HTMLTemplateElement).content.firstElementChild!;

export const streams: StreamLocal[] = JSON.parse(localStorage.getItem(key_streams) ?? "[]");
const add_streams = act<StreamLocal[]>([]);
const remove_streams = act<string[]>([]);

export const streams_update = act(() => {
    console.log("update streams")
    const adds = add_streams();
    const removes = remove_streams();
    if (adds.length === 0 && removes.length === 0) {
        return;
    }
    for (const add of adds as StreamLocal[]) {
        if (!streams.some(stream => stream.user_id === add.user_id)) {
            streams.push(add);
        }
    }

    for (const id of removes) {
        const index = streams.findIndex((stream) => stream.user_id === id);
        if (index === -1) {
            continue;
        }
        streams.splice(index, 1)
    }

    streams.sort(strCompareField("user_login"));
    localStorage.setItem(key_streams, JSON.stringify(streams))

    const sel_start = "[data-for=\"stream\"][data-item-id=\"";
    if (adds.length > 0) {
        renderStreams(stream_tmpl, streams_list, streams);
        htmx.process(streams_list as HTMLElement);

        const middle = (adds as StreamLocal[]).map(game => game.user_id).join("\"]," + sel_start);
        const selector = `${sel_start}${middle}"]`;
        const nodes = document.querySelectorAll(selector)
        nodes.forEach((node) => node.setAttribute("data-is-followed", "true"));
    }

    // TODO: remove stream follows
    if (removes.length > 0) {
        // remove sidebar list item(s)
        const sel_sidebar = ".js-streams-list .button-follow[data-item-id=\"";
        const query_selector = `${sel_sidebar}${removes.join("\"]," + sel_sidebar)}"]`;
        const list_items = document.querySelectorAll(query_selector)
        list_items.forEach((node) => node.closest("li")?.remove());
        
        // Update main content follows
        const selector = `${sel_start}${removes.join("\"]," + sel_start)}"]`;
        const nodes = document.querySelectorAll(selector)
        nodes.forEach((node) => node.setAttribute("data-is-followed", "false"));
    }

    add_streams([]);
    remove_streams([]);
})

export function addStream(item: StreamLocal) {
    add_streams([...add_streams(), item]);
};

export function removeStream(id: string) {
    remove_streams([...remove_streams(), id]);
};

const key_streams_live = `${key_streams}.live`
const key_live_check = `${key_streams_live}.last_check`
const live_check_ms = 600000 // 10 minutes

let live_streams: Record<string, string> = JSON.parse(localStorage.getItem(key_streams_live) || "{}");
let live_check = parseInt(JSON.parse(localStorage.getItem(key_live_check) ?? Date.now().toString()), 10);

const curr = Date.now();
if (curr > live_check + live_check_ms) {
    // TODO: check if users are live
}
// setTimeout(() => {
    // TODO: check if stream is live
// }, live_check_ms);

async function updateUsersLiveStatus(user_ids: string[]): Promise<void> {
    if (user_ids.length === 0) return
    const now = Date.now()
    const batch_count = Math.ceil(user_ids.length / TWITCH_MAX_QUERY_COUNT)
    let new_data: Record<string, string> = {}
    for (let i = 0; i < batch_count; i+=1) {
        const start = i * TWITCH_MAX_QUERY_COUNT
        const end = start + TWITCH_MAX_QUERY_COUNT
        const streams = await twitch.fetchStreams(user_ids.slice(start, end))
        for (const {user_id, game_name} of streams) {
          new_data[user_id] = game_name
        }
    }
    live_streams = new_data
    live_check = now
}

async function addLiveUser(user_id: string) {
    if (live_streams[user_id] === undefined) {
        const stream = (await twitch.fetchStreams([user_id]))[0]
        if (stream) {
            live_streams[stream.user_id] = stream.game_name
        }
    }
}



