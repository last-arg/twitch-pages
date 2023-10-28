import { act } from "@artalar/act";
import { strCompareField, StreamTwitch } from "./common";
import { twitch } from "./twitch"
import { renderSidebarItems, sb_state, sidebarShadows, sidebar_state } from "./sidebar";
import { action, atom } from 'nanostores'
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
    // - user page: heading
    // - category page: list (user/stream) items
    if (sb_state.get() === "streams") {
        renderSidebarItems("streams");
    }
    live_count.set(getLiveCount())
});
export const followStream = action(followed_streams, 'followStream', async (store, data: StreamLocal) => {
    if (!isStreamFollowed(data.user_id)) {
        const curr = store.get();
        curr.push(data);
        // TODO: copying is wasteful, do it better
        store.set([...curr]);
        if (!live_users.get()[data.user_id]) {
            addLiveUser(data.user_id);
        }
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

export const live_users = persistentAtom<Record<string, string | undefined>>("live_users", {}, {
    encode: JSON.stringify,
    decode: JSON.parse,
});
live_users.listen(function() {
    live_count.set(getLiveCount())
})
export const addLiveUser = action(live_users, 'addLiveUser', async (store, user_id: string) => {
    const new_value = live_users.get();
    if (!new_value[user_id]) {
        const stream = (await twitch.fetchStreams([user_id]))
        if (stream.length > 0) {
            new_value[user_id] = stream[0].game_name;
            store.set(new_value);
        }
    }
});

const live_last_update = persistentAtom<number>("live_last_update", 0, {
    encode: (val) => val.toString(),
    decode: (val) => parseInt(val, 10),
});

const live_check_ms = 300000; // 5 minutes
live_last_update.subscribe(function(last_update) {
    const diff = last_update - Date.now() + live_check_ms;
    if (diff < 0) {
        updateLiveUsers();
    } else {
        setTimeout(updateLiveUsers, Math.min(diff, live_check_ms));
    }
})

function getLiveCount(): number {
    let result = 0;
    const users = live_users.get();
    for (const key in users) {
        if (isStreamFollowed(key)) {
            result += 1;
        }
    }
    return result;
}
const live_count = atom(getLiveCount());
live_count.subscribe(function(count) {
    const stream_count = document.querySelector(".streams-count")!;
    if (count === 0) {
        stream_count.classList.add("hidden")
    } else {
        stream_count.textContent = count.toString();
        stream_count.classList.remove("hidden")
    }
});

const updateLiveStreams = action(live_users, "updateLiveStreams", function(store, curr_ids: string[], streams: StreamTwitch[]) {
    const users = store.get();
    for (const stream of streams) {
        users[stream.user_id] = stream.game_name;
    }

    for (const id of curr_ids) {
        if (!streams.some(({user_id}) => user_id === id)) {
            delete users[id];
        }
    }

    live_users.set(users);
    live_last_update.set(Date.now())
});

async function updateLiveUsers() {
    // TODO: concat with live_users ids?
    const curr_ids = followed_streams.get().map(({user_id}) => user_id);
    const new_live_streams = (await twitch.fetchLiveUsers(curr_ids));
    console.log(new_live_streams)
    updateLiveStreams(curr_ids, new_live_streams);
    setTimeout(updateLiveUsers, live_check_ms);
}


// TODO: delete old stuff below here
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

