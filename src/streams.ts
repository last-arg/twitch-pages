import { act } from "@artalar/act";
import { renderStreams, strCompareField } from "./common";
import { Twitch } from "./twitch";


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
export let live_streams = JSON.parse(localStorage.getItem(key_streams_live) || "{}");

export function setLiveStreams(value: any) { live_streams = value; }

export let live_check = parseInt(JSON.parse(localStorage.getItem(key_live_check) ?? Date.now().toString()), 10);
export const live_changes = act<[string[], string[], string[]]>([[], [], []]);

live_changes.subscribe((changes) => {
    const [adds, updates, removes] = changes;
    if (adds.length === 0 && updates.length === 0 && removes.length === 0) {
        return;
    }

    document.querySelectorAll(createSelector(removes)).forEach(node => node.classList.add("hidden"));

    for (const id of adds) {
        const cards = document.querySelectorAll(`.js-card-live[data-stream-id="${id}"]`);
        cards.forEach(node => {
            console.log(node)
            const p_or_a = node.querySelector("p, a")!;
            const game = live_streams[id];
            p_or_a.textContent = game;
            if (p_or_a.nodeName === "A") {
                (p_or_a as HTMLLinkElement).href = "https://twitch.tv/directory/game/" + encodeURIComponent(game);
            }
            node.classList.remove("hidden")
        })
    }

    for (const id of updates) {
        const cards = document.querySelectorAll(`.js-card-live[data-stream-id="${id}"] :is(p, a)`);
        cards.forEach(node => node.textContent = live_streams[id])
    }

    live_check = Date.now();
});

function createSelector(ids: string[]): string {
    const sel_start = `.js-card-live[data-stream-id="`;
    const middle = ids.join(`"],${sel_start}`);
    return `${sel_start}${middle}"]`;
}


async function addLiveUser(twitch: Twitch, user_id: string) {
    if (live_streams[user_id] === undefined) {
        const stream = (await twitch.fetchStreams([user_id]))[0]
        if (stream) {
            live_streams[stream.user_id] = stream.game_name
        }
    }
}

