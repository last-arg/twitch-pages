import { strCompareField, streams, live, user_images, categoryUrl, state } from "./common";
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
        this.$ = {
            /** @param {string} id */
            removeStream(id) {
                const btns = document.body.querySelectorAll(`[data-item-id='${id}']`);
                for (let i = 0; i < btns.length; i++) {
                    btns[i].setAttribute("data-is-followed", "false");
                }
            }
        };
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
        this.dispatchEvent(new CustomEvent('streams:save'));
    }

    /**
        @param {StreamLocal} data
    */
    follow(data) {
        if (!this.isFollowed(data.user_id)) {
            this.items.push(data);
            this.sort();
            live.addUser(data.user_id);
            user_images.add([data.user_id])
        }
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
        this.$.removeStream(remove_id);
        live.updateLiveCount();
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
        this.items.sort((a, b) => {
            const cmp = strCompareField("user_name")(a, b);
            const a_cmp = live.hasUser(a["user_id"]) ? -1e6 : 0;
            const b_cmp = live.hasUser(b["user_id"]) ? 1e6 : 0;
            return cmp + a_cmp + b_cmp;
        });
        this._save();
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

const live_check_ms = 300000; // 5 minutes
export class LiveStreams extends EventTarget {
    /** @type {Record<string, string | undefined>} */
    users = {}
    last_update = 0;
    timeout = 0;
    count = 0;

    /** @param {Streams} streams */
    constructor(streams) {
        super();
        this.$ = {
            /** @param {number} count */
            displayLiveCount(count) {
                const stream_count = /** @type {Element} */ (document.querySelector(".streams-count"));
                if (count === 0) {
                    stream_count.classList.add("hidden")
                } else {
                    stream_count.textContent = count.toString();
                    stream_count.classList.remove("hidden")
                }
            },

            /** @param {string[]} ids */
            displayLiveStreams(ids) {
                if (state.path === "streams") {
                    for (const id of ids) {
                        const card = document.querySelector(`.js-streams-list .js-card-live[data-stream-id="${id}"]`);
                        if (card) {
                            const p = /** @type {HTMLParagraphElement} */ (card.querySelector("p"));
                            p.textContent = live.users[id] || "";
                            card.classList.remove("hidden")
                        }
                    }
                }
                if (document.location.pathname.endsWith("/videos")) {
                    for (const id of ids) {
                        this.renderLiveStreamPageUser(id);
                    }
                }
            },

            /** @param {string[]} ids */
            updateLiveStreams(ids) {
                const live_streams = live.users;
                for (const id of ids) {
                    const cards = document.querySelectorAll(`.js-card-live[data-stream-id="${id}"] p`);
                    cards.forEach(node => node.textContent = live_streams[id] || "")
                    if (document.location.pathname.endsWith("/videos")) {
                        this.renderLiveStreamPageUser(id);
                    }
                }
            },

            /** @param {string[]} ids */
            removeLiveStreams(ids) {
                const sel_start = `.js-card-live[data-stream-id="`;
                const middle = ids.join(`"],${sel_start}`);
                const selector = `${sel_start}${middle}"]`;

                document.querySelectorAll(selector).forEach(node => node.classList.add("hidden"));
            },

            /** 
            @param {string} id
            */
            renderLiveStreamPageUser(id) {
                const card = document.querySelector(`#user-header .js-card-live[data-stream-id="${id}"]`);
                if (card) {
                    this.renderUserLiveness(id, card)
                }
            },

            /** 
            @param {string} id
            @param {Element} card
            */
            renderUserLiveness(id, card) {
                const a = /** @type {HTMLAnchorElement} */ (card.querySelector("a"));
                const game = /** @type {string} */ (live.users[id]);
                a.textContent = game;
                const href = categoryUrl(game);
                a.href = href;
                a.setAttribute("hx-push-url", href);
                card.classList.remove("hidden")
            }
        }
        this.localStorageKey = "live_users";
        this.localKeyLastUpdate = "live_last_update";
        this.streams = streams;
        this._readStorage();
        this.updateLiveCount();
        this.updateLiveUsers();

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
                this.users[user_id] = stream[0].game_name;
                this._save();
            }
        }
        this.updateLiveCount()
    };

    /** 
    @returns {number}
    */
    updateLiveCount() {
        let result = 0;
        const users = this.users;
        for (const key in users) {
            if (this.streams.isFollowed(key)) {
                result += 1;
            }
        }
        if (this.count !== result) {
            this.count = result;
            this.$.displayLiveCount(this.count);
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
            this.$.removeLiveStreams(removes)
        }

        if (updates.length > 0) {
            this.streams.sort();
            this.$.updateLiveStreams(updates)
        }

        if (adds.length > 0) {
            this.$.displayLiveStreams(adds)
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
        const curr_ids = this.streams.getIds();
        for (const id of Object.keys(this.users)) {
            if (!curr_ids.includes(id)) {
                curr_ids.push(id);
            }
        }
        const new_live_streams = await twitch.fetchLiveUsers(curr_ids);
        this.updateLiveStreams(curr_ids, new_live_streams);
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

    /**
      @param {string[]} ids
    */
    
    constructor(ids) {
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
        this.add(ids);
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
