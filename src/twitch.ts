import { StreamTwitch } from './common'

type UserTwitch = {id: string, profile_image_url: string};
type Search = {
    name: string,
    id: string,
}

const TWITCH_MAX_QUERY_COUNT = 100
export const TWITCH_CLIENT_ID = "7v5r973dmjp0nd1g43b8hcocj2airz";
const SEARCH_COUNT = 10

type TokenLocal = {
  access_token: string,
  expires_date: number,
}

type TokenResponse = {
  access_token: string,
  expires_in: number,
}

export class Twitch {
  static headers = {
    "Authorization": "",
    "Client-id": TWITCH_CLIENT_ID,
    "Accept": "application/vnd.twitchtv.v5+json",
  }

  twitch_token: TokenLocal | null = null
  is_fetching_token: boolean = false

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
    const now_seconds = Date.now() / 1000;
    if (!token || token.expires_date > now_seconds) {
      this.is_fetching_token = true;
      const r = await fetch("/api/twitch-api/?new-token");
      if (r.status !== 200) {
        console.warn("fetchToken(): Failed to get new twitch token");
        // TODO: handle failed request
      } else {
        const token = await r.json();
        this.setTwitchToken(token);
      }
      this.is_fetching_token = false;
    }
  }

  setTwitchToken(token: TokenResponse) {
    const expires_date = (Date.now() / 1000) + token.expires_in;
    this.twitch_token = { access_token: token.access_token, expires_date: expires_date };
    localStorage.setItem("twitch_token", JSON.stringify(this.twitch_token))
    Twitch.headers["Authorization"] = `Bearer ${this.twitch_token.access_token}`;
  }

  getTwitchToken(): string | null { return this.twitch_token?.access_token || null; }
  
  // setUserToken(token: string) {
  //   console.log("TODO: setUserToken")
  // }

  // TODO: when token becomes invalid
  // From twitch docs: 'If a token becomes invalid, your API requests return 
  //   HTTP status code 401 Unauthorized. When this happens, you’ll need to get a 
  //   new access token using the appropriate flow for your app.'
  // Have to check for 401 in any twitch API request code
  
  async fetchUsers(ids: string[]): Promise<UserTwitch[]> {
    if (ids.length === 0) return []
    const url = `https://api.twitch.tv/helix/users?id=${ids.join("&id=")}`;
    const resp = await fetch(url, {method: "GET", headers: Twitch.headers});
    if (resp.status !== 200) {
      console.warn("fetchUsers() status:", resp.status);
      return [];
    }
    return (await resp.json()).data;
  }

  async fetchSearch(input: string): Promise<Search[]> {
    const url = `https://api.twitch.tv/helix/search/categories?first=${SEARCH_COUNT}&query=${input}`;
    const r = await fetch(url, { method: "GET", headers: Twitch.headers })
    if (r.status !== 200) {
      console.warn("fetchSearch() status:", r.status);
      return [];
    }
    const results = await r.json()
    return results.data ?? []
  }
  
  async fetchStreams(user_ids: string[]): Promise<StreamTwitch[]> {
    if (user_ids.length === 0) return []
    const url = `https://api.twitch.tv/helix/streams?user_id=${user_ids.join("&user_id=")}&first=${TWITCH_MAX_QUERY_COUNT}`;
    const r = await fetch(url, {method: "GET", headers: Twitch.headers});
    if (r.status !== 200) {
      console.warn("fetchStreams() status:", r.status);
      return [];
    }
    return (await r.json()).data || [];
  }

  async fetchLiveUsers(user_ids: string[]): Promise<StreamTwitch[]> {
      const batch_count = Math.ceil(user_ids.length / TWITCH_MAX_QUERY_COUNT)
      const promises: ReturnType<Twitch['fetchStreams']>[] = [];
      for (let i = 0; i < batch_count; i+=1) {
          const start = i * TWITCH_MAX_QUERY_COUNT
          const end = start + TWITCH_MAX_QUERY_COUNT
          promises.push(this.fetchStreams(user_ids.slice(start, end)))
      }
      const result = await Promise.all(promises);
      return result.flat();
  }

  async fetchNewProfiles(user_ids: string[]): Promise<UserTwitch[]> {
      const batch_count = Math.ceil(user_ids.length / TWITCH_MAX_QUERY_COUNT);
      const promises: ReturnType<Twitch['fetchUsers']>[] = [];
      for (let i = 0; i < batch_count; i+=1) {
        const start = i * TWITCH_MAX_QUERY_COUNT;
        const end = start + TWITCH_MAX_QUERY_COUNT;
        promises.push(this.fetchUsers(user_ids.slice(start, end)))
      }
      const result = await Promise.all(promises);
      return result.flat();
  }
}
