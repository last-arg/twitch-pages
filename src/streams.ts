import { act } from "@artalar/act";
import { strCompareField, StreamTwitch, TWITCH_MAX_QUERY_COUNT } from "./common";
import { Twitch } from "./twitch";
import { twitch } from "./init";
import { renderSidebarItems, sidebar_state } from "./sidebar";


export type StreamLocal = {user_id: string, user_login: string, user_name: string};

const key_streams = "streams"

export const streams_list = document.querySelector(".js-streams-list")!;
export const stream_tmpl = (streams_list?.nextElementSibling! as HTMLTemplateElement).content.firstElementChild!;

export let streams: StreamLocal[] = JSON.parse(localStorage.getItem(key_streams) ?? "[]");
const add_streams = act<StreamLocal[]>([]);
const remove_streams = act<string[]>([]);

export const streams_update = act(() => {
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
        renderSidebarItems(sidebar_state());
    }

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

export function clearStreams() {
    streams = [];
    localStorage.setItem(key_streams, JSON.stringify(streams));
}

const key_streams_live = `${key_streams}.live`
const key_live_check = `${key_streams_live}.last_check`
export let live_streams = JSON.parse(localStorage.getItem(key_streams_live) || "{}");
export let live_check = parseInt(JSON.parse(localStorage.getItem(key_live_check) ?? Date.now().toString()), 10);
export const live_changes = act<StreamTwitch[]>([]);

live_changes.subscribe((streams) => {
    const adds = [];
    const updates = [];
    const removes = [];

    if (streams.length >= 0) {
        const new_ids = streams.map(({user_id}) => user_id);
        for (const user_id of Object.keys(live_streams)) {
           if (!new_ids.includes(user_id)) {
                removes.push(user_id);
                delete live_streams[user_id];
           }
        }
        for (const stream of streams) {
            const user_id = stream.user_id;
            const game = stream.game_name;
            const curr_game = live_streams[user_id];
            if (!curr_game) {
                adds.push(user_id);
                live_streams[user_id] = game;
            } else if (curr_game && curr_game !== game) {
                updates.push(user_id);
                live_streams[user_id] = game;
            }
        }
    } else {
        live_streams = {};
    }

    localStorage.setItem(key_streams_live, JSON.stringify(live_streams));
    live_check = Date.now();
    localStorage.setItem(key_live_check, live_check.toString());

    document.querySelectorAll(createSelector(removes)).forEach(node => node.classList.add("hidden"));

    for (const id of adds) {
        renderLiveStream(id)
    }

    for (const id of updates) {
        const cards = document.querySelectorAll(`.js-card-live[data-stream-id="${id}"] :is(p, a)`);
        cards.forEach(node => node.textContent = live_streams[id])
    }

    renderLiveCount(Object.keys(live_streams).length);
});

function renderLiveCount(count: number) {
    const stream_count = document.querySelector(".streams-count")!;
    if (count === 0) {
        stream_count.classList.add("hidden")
    } else {
        stream_count.textContent = count.toString();
        stream_count.classList.remove("hidden")
    }
}

function renderLiveStream(id: string) {
    const cards = document.querySelectorAll(`.js-card-live[data-stream-id="${id}"]`);
    cards.forEach(node => {
        const p_or_a = node.querySelector("p, a")!;
        const game = live_streams[id];
        p_or_a.textContent = game;
        if (p_or_a.nodeName === "A") {
            (p_or_a as HTMLLinkElement).href = "https://twitch.tv/directory/game/" + encodeURIComponent(game);
        }
        node.classList.remove("hidden")
    });
}

function createSelector(ids: string[]): string {
    const sel_start = `.js-card-live[data-stream-id="`;
    const middle = ids.join(`"],${sel_start}`);
    return `${sel_start}${middle}"]`;
}

export async function addLiveUser(twitch: Twitch, user_id: string) {
    if (live_streams[user_id] === undefined) {
        const stream = (await twitch.fetchStreams([user_id]))[0]
        if (stream) {
            live_streams[stream.user_id] = stream.game_name
            renderLiveStream(stream.user_id);
            renderLiveCount(Object.keys(live_streams).length);
        }
    }
}

export async function removeLiveUser(user_id: string) {
    delete live_streams[user_id]
    renderLiveCount(Object.keys(live_streams).length);
}

type ProfileImage = {url: string, last_access: number};
type ProfileImages = Record<string, ProfileImage>
const key_profile = `profile`;
const key_profile_check = `${key_profile}.last_check`;
export let profiles: ProfileImages = JSON.parse(localStorage.getItem(key_profile) || "{}");
export const profile_check = act(parseInt(JSON.parse(localStorage.getItem(key_profile_check) ?? Date.now().toString()), 10));

profile_check.subscribe((value) => {
    localStorage.setItem(key_profile_check, value.toString());
});

type UserTwitch = {id: string, profile_image_url: string};
export const add_profiles = act<string[]>([]);

add_profiles.subscribe(async (user_ids) => {
    if (user_ids.length === 0) {
        return;
    }

    // Filter and updated current profile/user ids
    const curr_ids = Object.keys(profiles);
    const filtered_ids = [];
    const now = Date.now();
    for (const id of user_ids) {
        if (curr_ids.includes(id)) {
            profiles[id].last_access = now;
        } else {
            filtered_ids.push(id);
        }
    }

    const new_profiles = await fetchNewProfiles(twitch, filtered_ids);
    if (new_profiles.length === 0) {
        return;
    }
    for (const p of new_profiles) {
        profiles[p.id] = { url: p.profile_image_url, last_access: now };
    }

    for (const id of user_ids) {
        const p = profiles[id];
        const img = document.querySelector(`img[src="#${id}"]`) as HTMLImageElement;
        if (img) {
            img.src = p.url;
        }
    }

    saveProfileImages();    
});

export function saveProfileImages() {
    localStorage.setItem(key_profile, JSON.stringify(profiles));
}

export function clearProfiles() {
    profiles = {};
    localStorage.setItem(key_profile, JSON.stringify(profiles));
}

// TODO: move to Twitch class?
export async function fetchNewProfiles(twitch: Twitch, user_ids: string[]): Promise<UserTwitch[]> {
    const results = [];
    const batch_count = Math.ceil(user_ids.length / TWITCH_MAX_QUERY_COUNT);
    for (let i = 0; i < batch_count; i+=1) {
      const start = i * TWITCH_MAX_QUERY_COUNT;
      const end = start + TWITCH_MAX_QUERY_COUNT;
      const profiles = await twitch.fetchUsers(user_ids.slice(start, end))
      results.push(...profiles)
    }
    return results;
}

