import { act } from "@artalar/act";
import { strCompareField, StreamTwitch } from "./common";
import { Twitch } from "./twitch";
import { renderSidebarItems, sb_state, sidebarShadows, sidebar_state } from "./sidebar";
import { twitch } from "./main";
import { action } from 'nanostores'
import { persistentAtom } from '@nanostores/persistent' 

export type StreamLocal = {user_id: string, user_login: string, user_name: string};

export const streams_list = document.querySelector(".js-streams-list")!;
export const stream_tmpl = (streams_list?.firstElementChild! as HTMLTemplateElement).content.firstElementChild!;
export const streams_scrollbox = streams_list.parentElement!;

export const followed_streams = persistentAtom<StreamLocal[]>("followed_streams", [], {
    encode: JSON.stringify,
    decode: JSON.parse,
});
followed_streams.listen(function(_) {
    // TODO: have check items in <main> also 
    // - user page heading
    // - category page list (user/stream) items
    if (sb_state.get() === "streams") {
        renderSidebarItems("streams");
    }
});
export const followStream = action(followed_streams, 'followStream', async (store, data: StreamLocal) => {
    if (!isStreamFollowed(data.user_id)) {
        const curr = store.get();
        curr.push(data);
        // TODO: copying is wasteful, do it better
        store.set([...curr]);
    }
});

export const unfollowStream = action(followed_streams, 'unfollowStream', async (store, user_id: string) => {
    const curr = store.get();
    let i = 0
    for (; i < curr.length; i++) {
        if (curr[i].user_id === user_id) {
            break;
        }
    }
    if (curr.length === i) {
        return;
    }
    curr.splice(i, 1);
    // TODO: copying is wasteful, do it better
    store.set([...curr]);
});

export function isStreamFollowed(input_id: string) {
    return followed_streams.get().some(({user_id}) => input_id === user_id);
}

// TODO: delete old stuff below here
const key_streams = "streams"
export let streams: StreamLocal[] = JSON.parse(localStorage.getItem(key_streams) ?? "[]");
const add_streams = act<StreamLocal[]>([]);
const remove_streams = act<string[]>([]);

add_streams.subscribe((adds) => {
    if (adds.length === 0) {
        return;
    }
    
    for (const add of adds as StreamLocal[]) {
        if (!streams.some(stream => stream.user_id === add.user_id)) {
            streams.push(add);
        }
    }

    streams.sort(strCompareField("user_login"));
    localStorage.setItem(key_streams, JSON.stringify(streams))

    if (adds.length > 0) {
        renderSidebarItems(sidebar_state());
    }

    add_streams().length = 0;
});

remove_streams.subscribe((removes) => {
    const sel_start = "[data-for=\"stream\"][data-item-id=\"";
    if (removes.length === 0) {
        return;
    }
    
    for (const id of removes) {
        const index = streams.findIndex((stream) => stream.user_id === id);
        if (index === -1) {
            continue;
        }
        streams.splice(index, 1)
    }

    localStorage.setItem(key_streams, JSON.stringify(streams))

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
        sidebarShadows(streams_scrollbox);
    }

    remove_streams().length = 0;
})

export function clearStreams() {
    streams = [];
    localStorage.setItem(key_streams, JSON.stringify(streams));
}

const key_streams_live = `${key_streams}.live`
const key_live_check = `${key_streams_live}.last_check`
const live_streams = JSON.parse(localStorage.getItem(key_streams_live) || "{}");
export let live_check = parseInt(JSON.parse(localStorage.getItem(key_live_check) ?? "0"), 10);
const live_check_adds: string[] = Object.keys(live_streams);
const live_check_removes: string[] = [];
const live_check_updates: string[] = [];

export const live_streams_local = act(live_streams);
live_streams_local.subscribe((lives) => {
    renderLiveAdd(live_check_adds);
    renderLiveUpdate(live_check_updates);
    renderLiveRemove(live_check_removes);
    localStorage.setItem(key_streams_live, JSON.stringify(lives));
})

const live_count = act(() => Object.keys(live_streams_local()).length);

live_count.subscribe((val) => {
    renderLiveCount(val);
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

function renderLiveAdd(ids: string[]) {
    if (ids.length === 0) {
        return;
    }
    if (sidebar_state && sidebar_state() === "streams") {
        for (const id of ids) {
            renderLiveStreamSidebar(id)
        }
    }
    if (document.location.pathname.endsWith("/videos")) {
        for (const id of ids) {
            renderLiveStreamPageUser(id);
        }
    }
    live_check_adds.length = 0;
}

function renderLiveRemove(ids: string[]) {
    if (ids.length === 0)  {
        return;
    }
    document.querySelectorAll(createSelector(ids)).forEach(node => node.classList.add("hidden"));
    live_check_removes.length = 0;
};

function renderLiveUpdate(ids: string[]) {
    if (ids.length === 0)  {
        return;
    }
    const live_streams = live_streams_local();
    for (const id of ids) {
        const cards = document.querySelectorAll(`.js-card-live[data-stream-id="${id}"] :is(p, a)`);
        cards.forEach(node => node.textContent = live_streams[id])
    }
    live_check_updates.length = 0;
};

function renderLiveStreamSidebar(id: string) {
    const card = document.querySelector(`.js-streams-list .js-card-live[data-stream-id="${id}"]`);
    if (card) {
        const live_streams = live_streams_local();
        const p = card.querySelector("p")!;
        p.textContent = live_streams[id];
        card.classList.remove("hidden")
    }
}

function renderLiveStreamPageUser(id: string) {
    const card = document.querySelector(`#user-header .js-card-live[data-stream-id="${id}"]`);
    if (card) {
        const live_streams = live_streams_local();
        const a = card.querySelector("a")!;
        const game = live_streams[id];
        a.textContent = game;
        a.href = "https://twitch.tv/directory/game/" + encodeURIComponent(game);
        card.classList.remove("hidden")
    }
}

function createSelector(ids: string[]): string {
    const sel_start = `.js-card-live[data-stream-id="`;
    const middle = ids.join(`"],${sel_start}`);
    return `${sel_start}${middle}"]`;
}

export async function addLiveUser(twitch: Twitch, user_id: string) {
    const live_streams = live_streams_local();
    if (live_streams[user_id] === undefined) {
        const stream = (await twitch.fetchStreams([user_id]))[0]
        if (stream) {
            live_check_adds.push(user_id);
            live_streams_local(Object.assign({[stream.user_id]: stream.game_name}, live_streams_local()))
        }
    }
}

export async function removeLiveUser(user_id: string) {
    live_check_removes.push(user_id);
    delete live_streams_local()[user_id]
    live_streams_local(Object.assign({}, live_streams_local()))
}

export type ProfileImage = {url: string, last_access: number};
export type ProfileImages = Record<string, ProfileImage>
const key_profile = `profile`;
const key_profile_check = `${key_profile}.last_check`;
export let profiles: ProfileImages = JSON.parse(localStorage.getItem(key_profile) || "{}");
export const profile_check = act(parseInt(JSON.parse(localStorage.getItem(key_profile_check) ?? Date.now().toString()), 10));

profile_check.subscribe((value) => {
    localStorage.setItem(key_profile_check, value.toString());
});

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

    const new_profiles = await twitch.fetchNewProfiles(filtered_ids);
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

