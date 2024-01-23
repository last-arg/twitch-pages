import { strCompareField, categoryUrl } from "./common";
import { twitch } from "./twitch"
import { renderSidebarItems, sb_state } from "./sidebar";
import { action, atom, map } from 'nanostores'
import { persistentAtom, persistentMap } from '@nanostores/persistent' 

/**
@typedef {import("./common").StreamTwitch} StreamTwitch

@typedef {{user_id: string, user_login: string, user_name: string}} StreamLocal
*/

export const streams_list = /** @type {Element} */ (document.querySelector(".js-streams-list"));
const tmp_elem = /** @type {HTMLTemplateElement} */ (streams_list.firstElementChild);
export const stream_tmpl = /** @type {Element} */ (tmp_elem.content.firstElementChild);
export const streams_scrollbox = /** @type {HTMLElement} */ (streams_list.parentElement);

/** @type {string | undefined} */
let removed_stream = undefined;
/** @type {import("nanostores").WritableAtom<StreamLocal[]>} */
export const followed_streams = persistentAtom("followed_streams", [], {
    encode: JSON.stringify,
    decode: JSON.parse,
});
followed_streams.listen(function(_) {
    if (sb_state.get() === "streams") {
        renderSidebarItems("streams");
    }
    if (removed_stream) {
        const btns = document.body.querySelectorAll(`[data-item-id='${removed_stream}']`);
        for (let i = 0; i < btns.length; i++) {
            btns[i].setAttribute("data-is-followed", "false");
        }
        removed_stream = undefined;
    }
    live_count.set(getLiveCount());
});

export const clearStreams = action(followed_streams, "clearStreams", (store) => {
    store.set([]);
})

/**
@type {(data: StreamLocal) => void}
*/
export const followStream = action(followed_streams, 'followStream', async (store, /** @type {StreamLocal} */ data) => {
    if (!isStreamFollowed(data.user_id)) {
        const curr = store.get();
        curr.push(data);
        // TODO: copying is wasteful, do it better
        store.set([...curr.sort(sortStreams)]);
        if (!live_users.get()[data.user_id]) {
            addLiveUser(data.user_id);
        }
        if (!profile_images.get()["images"][data.user_id]) {
            add_images.set([data.user_id]);
        }
    }
});

/**
@type {(user_id: string) => void}
*/
export const unfollowStream = action(followed_streams, 'unfollowStream', async (store, /** @type {string} */ user_id) => {
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
    removed_stream = curr.splice(i, 1)[0].user_id;
    // TODO: copying is wasteful, do it better
    store.set([...curr]);
});


/** @param {string} input_id */
export function isStreamFollowed(input_id) {
    return followed_streams.get().some(({user_id}) => input_id === user_id);
}

/** @type {string[]} */
let live_removes = [];
/** @type {string[]} */
let live_updates = [];
/** @type {string[]} */
let live_adds = [];
/** @type {import("nanostores").WritableAtom<Record<string, string | undefined>>} */
export const live_users = persistentAtom("live_users", {}, {
    encode: JSON.stringify,
    decode: JSON.parse,
});
live_users.listen(function() {
    console.log("live_users render")
    console.log("live_removes", live_removes)
    renderLiveRemove(live_removes);
    live_removes.length = 0;
    console.log("live_updates", live_updates)
    renderLiveUpdate(live_updates);
    live_updates.length = 0;
    console.log("live_adds", live_adds)
    renderLiveAdd(live_adds);
    live_adds.length = 0;
    followed_streams.set([...followed_streams.get().sort(sortStreams)]);
})

/** 
@param {StreamLocal} a
@param {StreamLocal} b
*/
function sortStreams(a, b) {
    const cmp = strCompareField("user_name")(a, b);
    const a_cmp = isLiveStream(a["user_id"]) ? -1e6 : 0;
    const b_cmp = isLiveStream(b["user_id"]) ? 1e6 : 0;
    return cmp + a_cmp + b_cmp;
}

/** 
@param {string} name
*/
function isLiveStream(name) {
    for (const user_name in live_users.get()) {
        if (user_name == name) {
            return true;
        }
    }
    return false;
}

/**
@type {(user_id: string) => void}
*/
export const addLiveUser = action(live_users, 'addLiveUser', async (store, /** @type {string} */ user_id) => {
    const new_value = live_users.get();
    if (!new_value[user_id]) {
        const stream = (await twitch.fetchStreams([user_id]))
        if (stream.length > 0) {
            new_value[user_id] = stream[0].game_name;
            // TODO: copying bad
            store.set({...new_value});
        }
    }
});

/** 
@param {string[]} ids
*/
function renderLiveRemove(ids) {
    if (ids.length === 0)  {
        return;
    }

    const sel_start = `.js-card-live[data-stream-id="`;
    const middle = ids.join(`"],${sel_start}`);
    const selector = `${sel_start}${middle}"]`;

    document.querySelectorAll(selector).forEach(node => node.classList.add("hidden"));
};

/** 
@param {string[]} ids
*/
function renderLiveUpdate(ids) {
    if (ids.length === 0)  {
        return;
    }
    const live_streams = live_users.get();
    for (const id of ids) {
        const cards = document.querySelectorAll(`.js-card-live[data-stream-id="${id}"] p`);
        cards.forEach(node => node.textContent = live_streams[id] || "")
        if (document.location.pathname.endsWith("/videos")) {
            renderLiveStreamPageUser(id);
        }
    }
};

/** 
@param {string[]} ids
*/
function renderLiveAdd(ids) {
    if (ids.length === 0) {
        return;
    }
    if (sb_state.get() === "streams") {
        for (const id of ids) {
            renderLiveStreamSidebar(id)
        }
    }
    if (document.location.pathname.endsWith("/videos")) {
        for (const id of ids) {
            renderLiveStreamPageUser(id);
        }
    }
}

/** 
@param {string} id
*/
function renderLiveStreamSidebar(id) {
    const card = document.querySelector(`.js-streams-list .js-card-live[data-stream-id="${id}"]`);
    if (card) {
        const p = /** @type {HTMLParagraphElement} */ (card.querySelector("p"));
        p.textContent = live_users.get()[id] || "";
        card.classList.remove("hidden")
    }
}

/** 
@param {string} id
*/
function renderLiveStreamPageUser(id) {
    const card = document.querySelector(`#user-header .js-card-live[data-stream-id="${id}"]`);
    if (card) {
        renderUserLiveness(id, card)
    }
}

/** 
@param {string} id
@param {Element} card
*/
export function renderUserLiveness(id, card) {
    const a = /** @type {HTMLAnchorElement} */ (card.querySelector("a"));
    const game = /** @type {string} */ (live_users.get()[id]);
    a.textContent = game;
    const href = categoryUrl(game);
    a.href = href;
    a.setAttribute("hx-push-url", href);
    card.classList.remove("hidden")
}

/** @type {import("nanostores").WritableAtom<number>} */
const live_last_update = persistentAtom("live_last_update", 0, {
    encode: (val) => val.toString(),
    decode: (val) => Number(val),
});

/** 
@returns {number}
*/
function getLiveCount() {
    let result = 0;
    const users = live_users.get();
    for (const key in users) {
        if (isStreamFollowed(key)) {
            result += 1;
        }
    }
    return result;
}
const live_count = atom(0);
live_count.subscribe(function(count) {
    console.log("change live count", count);
    const stream_count = /** @type {Element} */ (document.querySelector(".streams-count"));
    if (count === 0) {
        stream_count.classList.add("hidden")
    } else {
        stream_count.textContent = count.toString();
        stream_count.classList.remove("hidden")
    }
});

/**
@type {(curr_ids: string[], streams: StreamTwitch[]) => void}
*/
const updateLiveStreams = action(live_users, "updateLiveStreams", function(store, /** @type {string[]} */ curr_ids, /** @type {StreamTwitch[]} */ streams) {
    const users = store.get();
    const updates = [];
    const adds = [];
    for (const stream of streams) {
        if (users[stream.user_id])  {
            updates.push(stream.user_id)
        } else {
            adds.push(stream.user_id)
        }
        users[stream.user_id] = stream.game_name;
    }

    const removes = []
    for (const id of curr_ids) {
        if (!streams.some(({user_id}) => user_id === id)) {
            removes.push(id);
            delete users[id];
        }
    }

    if (removes.length === 0 && adds.length === 0 && updates.length === 0) {
        return;
    }

    live_removes = removes;
    live_adds = adds;
    live_updates = updates;
    // TODO: copying bad
    live_users.set({...users});
});

const live_check_ms = 300000; // 5 minutes
let live_user_update = 0;
export async function updateLiveUsers() {
    const now = Date.now();
    const diff = live_last_update.get() - now + live_check_ms;
    console.log("updateLiveUsers", live_last_update.get(), now, diff)
    clearTimeout(live_user_update);
    if (diff > 0) {
        live_user_update = window.setTimeout(updateLiveUsers, diff + 1000);
        return;
    }
    console.log("update now")
    const curr_ids = followed_streams.get().map(({user_id}) => user_id);
    for (const id of Object.keys(live_users.get())) {
        if (!curr_ids.includes(id)) {
            curr_ids.push(id);
        }
    }
    const new_live_streams = await twitch.fetchLiveUsers(curr_ids);
    console.log("curr_ids", curr_ids)
    console.log("new_live_streams", new_live_streams)
    updateLiveStreams(curr_ids, new_live_streams);
    live_last_update.set(now)
    live_user_update = window.setTimeout(updateLiveUsers, live_check_ms + 1000);
}

/** 
@typedef {{url: string, last_access: number}} ProfileImage

@typedef {Record<string, ProfileImage>} ProfileImages

@typedef {{images: ProfileImages, last_update: number}} ProfileLocalStorage
*/

/** @type {import("nanostores/map").MapStore<ProfileLocalStorage>} */
export const profile_images = persistentMap("profile_images:", {
    images : {},
    last_update: 0,
}, {
    encode: JSON.stringify,
    decode: JSON.parse,
});

export const clearProfiles = action(followed_streams, "clearProfiles", (store) => {
    store.set([]);
})

/** @type {import("nanostores/map").MapStore<string[]>} */
export const add_images = map([]);
add_images.listen(async function(user_ids) {
    if (user_ids.length === 0) {
        return;
    }

    const imgs = profile_images.get()["images"];
    // Filter and updated current profile/user ids
    const curr_ids = Object.keys(imgs);
    const filtered_ids = [];
    const now = Date.now();
    for (const id of user_ids) {
        if (curr_ids.includes(id)) {
            imgs[id].last_access = now;
        } else {
            filtered_ids.push(id);
        }
    }
    add_images.get().length = 0;
    if (filtered_ids.length > 0) {
        const new_profiles = await twitch.fetchNewProfiles(filtered_ids);
        if (new_profiles.length === 0) {
            return;
        }
        for (const p of new_profiles) {
            imgs[p.id] = { url: p.profile_image_url, last_access: now };

            // Update UI
            const img = /** @type {HTMLImageElement} */ (document.querySelector(`img[src="#${p.id}"]`));
            if (img) {
                img.src = p.profile_image_url;
            }
        }
    }

    profile_images.setKey("images", imgs);
}) 

const a_day = 24 * 60 * 60 * 1000;
export function initProfileImages() {
    const imgs = profile_images.get();
    const check_time = imgs["last_update"] + a_day;
    const now = Date.now();
    if (check_time < now) {

        for (const id in imgs.images) {
            if (imgs.images[id].last_access > check_time && !isFollowedStream(id)) {
                delete imgs.images[id];
            }
        }

        imgs.last_update = now;
        profile_images.set(imgs);
    }
    add_images.set(followed_streams.get().map(({user_id}) => user_id));
}

/** @param {string} id */
function isFollowedStream(id) {
    for (const stream of followed_streams.get()) {
        if (stream.user_id == id) {
            return true;
        }
    }
    return false;
}
