import { strCompareField, streams, live, user_images } from "./common";
import { twitch } from "./twitch"

/**
@typedef {import("./common").StreamTwitch} StreamTwitch

@typedef {{user_id: string, user_login: string, user_name: string}} StreamLocal
*/

export class Streams extends EventTarget {
    /** @type {StreamLocal[]} */
    items = []
    constructor() {
        super();
        this.localStorageKey = "followed_streams";
        this._readStorage();

        // handle edits in another window
        window.addEventListener("storage", () => {
            this._readStorage();
            this._save();
        }, false);
    }

    _readStorage() {
        const raw = window.localStorage.getItem(this.localStorageKey)
        if (raw) {
            this.items = JSON.parse(raw);
        }
    }

    _save() {
        window.localStorage.setItem(this.localStorageKey, JSON.stringify(this.items));
        this.dispatchEvent(new CustomEvent('games:save'));
    }

    /**
        @param {StreamLocal} data
    */
    follow(data) {
        if (!this.isFollowed(data.user_id)) {
            this.items.push(data);
            this.items.sort(sortStreams);
            live.addUser(data.user_id);
            user_images.add([data.user_id])
        }
        this._save();
    };


    /**
        @param {string} user_id
    */
    unfollow(user_id) {
        const curr = this.items;
        let i = 0
        for (; i < curr.length; i++) {
            if (curr[i].user_id === user_id) {
                break;
            }
        }
        if (curr.length === i) { return; }

        const remove_id = curr.splice(i, 1)[0].user_id;
        this.dispatchEvent(new CustomEvent('games:remove', {detail: {id: remove_id}}));
        this._save();
    };    

    /** @param {string} input_id */
    isFollowed(input_id) {
        return this.items.some(({user_id}) => input_id === user_id);
    }

    clear() {
        this.items = [];
        this._save();
    }

    sort() {
        this.items.sort(sortStreams);
    }

    /**
      @returns {string[]}
    */
    getIds() {
        return this.items.map(({user_id}) => user_id);
    }
}

/** 
@param {StreamLocal} a
@param {StreamLocal} b
*/
function sortStreams(a, b) {
    const cmp = strCompareField("user_name")(a, b);
    const a_cmp = streams.isFollowed(a["user_id"]) ? -1e6 : 0;
    const b_cmp = streams.isFollowed(b["user_id"]) ? 1e6 : 0;
    return cmp + a_cmp + b_cmp;
}

// TODO: move these if possible
export const streams_list = /** @type {Element} */ (document.querySelector(".js-streams-list"));
const tmp_elem = /** @type {HTMLTemplateElement} */ (streams_list.firstElementChild);
export const stream_tmpl = /** @type {Element} */ (tmp_elem.content.firstElementChild);
export const streams_scrollbox = /** @type {HTMLElement} */ (streams_list.parentElement);

const live_check_ms = 300000; // 5 minutes
export class LiveStreams extends EventTarget {
    /** @type {Record<string, string | undefined>} */
    users = {}
    last_update = 0;
    timeout = 0;
    count = 0;

    constructor() {
        super();
        this.localStorageKey = "live_users";
        this.localKeyLastUpdate = "live_last_update";
        this._readStorage();
        this.updateLiveCount();

        // handle edits in another window
        window.addEventListener("storage", () => {
            this._readStorage();
            this._save();
        }, false);
    }

    updateDiff() {
        return this.last_update - Date.now() + live_check_ms;
    }

    _readStorage() {
        let raw = window.localStorage.getItem(this.localStorageKey)
        if (raw) {
            this.users = JSON.parse(raw);
        }
        raw = window.localStorage.getItem(this.localKeyLastUpdate)
        if (raw) {
            this.last_update = Number(raw);
        }
    }

    _save() {
        window.localStorage.setItem(this.localStorageKey, JSON.stringify(this.users));
        window.localStorage.setItem(this.localKeyLastUpdate, this.last_update.toString());
        this.dispatchEvent(new CustomEvent('live:save'));
    }

    /** 
    @param {string} name
    */
    hasUser(name) {
        for (const user_name in this.users) {
            if (user_name == name) {
                return true;
            }
        }
        return false;
    }

    /**
    @type {(user_id: string) => Promise<void>}
    */
    async addUser(user_id) {
        if (!this.users[user_id]) {
            const stream = (await twitch.fetchStreams([user_id]))
            if (stream.length > 0) {
                this._save();
            }
        }
    };

    /** 
    @returns {number}
    */
    updateLiveCount() {
        let result = 0;
        const users = this.users;
        for (const key in users) {
            if (streams.isFollowed(key)) {
                result += 1;
            }
        }
        if (this.count !== result) {
            this.count = result;
            this.dispatchEvent(new CustomEvent('live:count', {detail: {count: this.count}}));
        }
        return result;
    }

    /**
        @param {string[]} curr_ids
        @param {StreamTwitch[]} streams
    */
    updateLiveStreams(curr_ids, streams) {
        const updates = [];
        const adds = [];
        for (const stream of streams) {
            if (this.users[stream.user_id])  {
                updates.push(stream.user_id)
            } else {
                adds.push(stream.user_id)
            }
            this.users[stream.user_id] = stream.game_name;
        }

        const removes = []
        for (const id of curr_ids) {
            if (!streams.some(({user_id}) => user_id === id)) {
                removes.push(id);
                delete this.users[id];
            }
        }

        this.last_update = Date.now();

        if (removes.length === 0 && adds.length === 0 && updates.length === 0) {
            return;
        }

        if (removes.length > 0) {
            this.dispatchEvent(new CustomEvent('live:remove', {detail: {ids: removes}}));
        }

        if (updates.length > 0) {
            this.dispatchEvent(new CustomEvent('live:update', {detail: {ids: updates}}));
        }

        if (adds.length > 0) {
            this.dispatchEvent(new CustomEvent('live:add', {detail: {ids: adds}}));
        }

        const diff = removes.length + adds.length;
        if (diff !== 0) {
            this.count = this.updateLiveCount();
        }

        this._save();
    }

    async updateLiveUsers() {
        const diff = this.updateDiff();
        clearTimeout(this.timeout);
        if (diff > 0) {
            this.timeout = window.setTimeout(() => this.updateLiveUsers(), diff + 1000);
            return;
        }
        if (streams) {
            const curr_ids = streams.getIds();
            for (const id of Object.keys(live.users)) {
                if (!curr_ids.includes(id)) {
                    curr_ids.push(id);
                }
            }
            const new_live_streams = await twitch.fetchLiveUsers(curr_ids);
            live.updateLiveStreams(curr_ids, new_live_streams);
        }
        this.timeout = window.setTimeout(() => this.updateLiveUsers(), live_check_ms + 1000);
    }
}


/** 
@typedef {{url: string, last_access: number}} ProfileImage

@typedef {Record<string, ProfileImage>} ProfileImages

@typedef {{images: ProfileImages, last_update: number}} ProfileLocalStorage
*/
export class UserImages extends EventTarget {
    /** @type {ProfileLocalStorage} */
    data = {images: {}, last_update: 0};

    constructor() {
        super();
        this.$ = {
            /** @param {import("./twitch").UserTwitch[]} profiles */
            displayImages(profiles) {
                for (const p of profiles) {
                    const img = /** @type {HTMLImageElement} */ (document.querySelector(`img[src="#${p.id}"]`));
                    if (img) {
                        img.src = p.profile_image_url;
                    }
                }
            }
        }
        this.localStorageKey = "user_images";
        this._readStorage();
        this.clean();

        // handle edits in another window
        window.addEventListener("storage", () => {
            this._readStorage();
            this._save();
        }, false);
    }

    _readStorage() {
        const raw = window.localStorage.getItem(this.localStorageKey)
        if (raw) {
            this.data = JSON.parse(raw);
        }
    }

    /**
      @param {string[]} ids
    */
    
    async add(ids) {
        if (ids.length === 0) {
            return;
        }

        const imgs = this.data.images;
        // Filter and updated current profile/user ids
        const curr_ids = Object.keys(imgs);
        const filtered_ids = [];
        const now = Date.now();
        for (const id of ids) {
            if (curr_ids.includes(id)) {
                imgs[id].last_access = now;
            } else {
                filtered_ids.push(id);
            }
        }

        if (filtered_ids.length > 0) {
            const new_profiles = await twitch.fetchNewProfiles(filtered_ids);
            if (new_profiles.length === 0) {
                return;
            }
            for (const p of new_profiles) {
                imgs[p.id] = { url: p.profile_image_url, last_access: now };
            }
            this.$.displayImages(new_profiles)
        }

        this.data.images = imgs;
        this._save();
    }

    _save() {
        window.localStorage.setItem(this.localStorageKey, JSON.stringify(this.data));
    }

    clear() {
        this.data.images = {};
        this._save();
    }

    clean() {
        const a_day = 24 * 60 * 60 * 1000;
        const data = this.data;
        const check_time = data["last_update"] + a_day;
        const now = Date.now();
        if (check_time < now) {
            for (const id in data.images) {
                if (data.images[id].last_access > check_time && !streams.isFollowed(id)) {
                    delete data.images[id];
                }
            }

            data.last_update = now;
            this.data = data;
        }
    }
}
