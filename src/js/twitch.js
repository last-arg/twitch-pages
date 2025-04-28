import { TWITCH_CLIENT_ID } from './config.prod'

/**
@typedef {import("./common").StreamTwitch} StreamTwitch

@typedef {{id: string, profile_image_url: string}} UserTwitch

@typedef {{name: string, id: string}} Search

@typedef {{access_token: string, expires_date: number}} TokenLocal
*/

const TWITCH_MAX_QUERY_COUNT = 100
const SEARCH_COUNT = 10

export class Twitch {
  /** @type {Record<string, string>} */
  static headers = {
    "Authorization": "",
    "Client-id": TWITCH_CLIENT_ID,
    "Accept": "application/json",
    "Content-Type": "application/json",
  }

  /** @type {TokenLocal | null} */
  twitch_token = null
  /** @type {boolean} */
  is_fetching_token = false

  constructor() {
    const local_token = localStorage.getItem("twitch_token");
    if (!local_token) {
      return;
    }
    const token = JSON.parse(local_token);
    this.setTwitchToken(token);
  }

  async fetchToken() {
    let token = this.twitch_token
    const now_seconds = Math.floor(Date.now() / 1000);
    if (!token || token.expires_date < now_seconds) {
      this.is_fetching_token = true;
      const r = await fetch("/api/new-token", {cache: 'no-store'});
      if (r.status !== 200) {
        console.warn("fetchToken(): Failed to get new twitch token");
        // TODO: handle failed request
      } else {
        const token = await r.json();
        const expires_date = Math.floor(Date.now() / 1000) + token.expires_in;
        this.setTwitchToken({ access_token: token.access_token, expires_date: expires_date });
      }
      this.is_fetching_token = false;
    }
  }

  /**
  @param {TokenLocal} token
  */
  setTwitchToken(token) {
    this.twitch_token = token;
    localStorage.setItem("twitch_token", JSON.stringify(this.twitch_token))
    Twitch.headers["Authorization"] = `Bearer ${this.twitch_token.access_token}`;
  }

  /**
  @returns {string | null}
  */
  getTwitchToken() { return this.twitch_token?.access_token || null; }
  
  /**
  @param {string[]} ids
  @returns {Promise<UserTwitch[]>}
  */
  async fetchUsers(ids) {
    if (ids.length === 0) return []
    const url = `https://api.twitch.tv/helix/users?id=${ids.join("&id=")}`;
    let resp = await this.twitchFetch(url);
    if (resp.status !== 200) {
      console.warn("fetchUsers() status:", resp.status);
      return [];
    }
    return (await resp.json()).data;
  }

  /**
  @param {string} url
  @returns {Promise<Response>}
  */
  async twitchFetch(url) {
    const opts = /** @type {RequestInit} */ ({cache: "no-store", method: "GET", headers: Twitch.headers});
    let resp = await fetch(url, opts)
    if (resp.status === 401) {
      await this.fetchToken();
      resp = await fetch(url, opts);
    }
    return resp;
  }

  /**
    @param {string} input
    @returns {Promise<Search[]>}
  */  
  async fetchSearch(input) {
    const url = `https://api.twitch.tv/helix/search/categories?first=${SEARCH_COUNT}&query=${input}`;
    const resp = await this.twitchFetch(url);
    if (resp.status !== 200) {
      console.warn("fetchSearch() status:", resp.status);
      return [];
    }
    const results = await resp.json()
    return results.data ?? []
  }
  
  /**
    @param {string[]} user_ids
    @returns {Promise<StreamTwitch[]>}
  */
  async fetchStreams(user_ids) {
    if (user_ids.length === 0) return []
    const url = `https://api.twitch.tv/helix/streams?user_id=${user_ids.join("&user_id=")}&first=${TWITCH_MAX_QUERY_COUNT}`;
    const r = await this.twitchFetch(url);
    if (r.status !== 200) {
      console.warn("fetchStreams() status:", r.status);
      return [];
    }
    return (await r.json()).data || [];
  }

  /**
    @param {string[]} user_ids
    @returns {Promise<StreamTwitch[]>}
  */
  async fetchLiveUsers(user_ids) {
      const batch_count = Math.ceil(user_ids.length / TWITCH_MAX_QUERY_COUNT)
      /** @type {ReturnType<Twitch['fetchStreams']>[]} */
      const promises = [];
      for (let i = 0; i < batch_count; i+=1) {
          const start = i * TWITCH_MAX_QUERY_COUNT
          const end = start + TWITCH_MAX_QUERY_COUNT
          promises.push(this.fetchStreams(user_ids.slice(start, end)))
      }
      const result = await Promise.all(promises);
      return result.flat();
  }

  /**
    @param {string[]} user_ids
    @returns {Promise<UserTwitch[]>}
  */
  async fetchNewProfiles(user_ids) {
      const batch_count = Math.ceil(user_ids.length / TWITCH_MAX_QUERY_COUNT);
      /** @type {ReturnType<Twitch['fetchUsers']>[]} */
      const promises = [];
      for (let i = 0; i < batch_count; i+=1) {
        const start = i * TWITCH_MAX_QUERY_COUNT;
        const end = start + TWITCH_MAX_QUERY_COUNT;
        promises.push(this.fetchUsers(user_ids.slice(start, end)))
      }
      const result = await Promise.all(promises);
      return result.flat();
  }
}

export const twitch = new Twitch();
