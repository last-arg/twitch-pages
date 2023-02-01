import { StreamTwitch } from './common'

type UserTwitch = {id: string, profile_image_url: string};
type Search = {
    name: string,
    id: string,
}

const TWITCH_MAX_QUERY_COUNT = 100
export const TWITCH_CLIENT_ID = "7v5r973dmjp0nd1g43b8hcocj2airz";
const SEARCH_COUNT = 10

export class Twitch {
  static headers = {
    "Authorization": "",
    "Client-id": TWITCH_CLIENT_ID,
    "Accept": "application/vnd.twitchtv.v5+json",
  }

  twitch_token: string | null = null
  is_fetching_token: boolean = false

  constructor() {
    this.twitch_token = localStorage.getItem("twitch_token");
    if (this.twitch_token) {
      this.setTwitchToken(this.twitch_token);
    }
  }
  async fetchToken() {
    let token = this.getTwitchToken();
    if (!token) {
      this.is_fetching_token = true;
      const r = await fetch("/api/twitch-api/?new-token");
      if (r.status !== 200) {
        console.warn("Failed to get new twitch token");
        // TODO: handle failed request
      } else {
        const token = await r.text();
        this.setTwitchToken(token);
      }
      this.is_fetching_token = false;
    }
  }

  setTwitchToken(token: string) {
    this.twitch_token = token
    localStorage.setItem("twitch_token", token)
    Twitch.headers["Authorization"] = `Bearer ${token}`;
  }

  getTwitchToken(): string | null { return this.twitch_token; }
  
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
    if (resp.status === 401) {
      
    }
    return (await resp.json()).data;
  }

  async fetchSearch(input: string): Promise<Search[]> {
    const url = `https://api.twitch.tv/helix/search/categories?first=${SEARCH_COUNT}&query=${input}`;
    const r = await fetch(url, { method: "GET", headers: Twitch.headers })
    const results = await r.json()
    return results.data ?? []
  }
  
  async fetchStreams(user_ids: string[]): Promise<StreamTwitch[]> {
    if (user_ids.length === 0) return []
    const url = `https://api.twitch.tv/helix/streams?user_id=${user_ids.join("&user_id=")}&first=${TWITCH_MAX_QUERY_COUNT}`;
    return (await (await fetch(url, {method: "GET", headers: Twitch.headers})).json()).data || [];
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
