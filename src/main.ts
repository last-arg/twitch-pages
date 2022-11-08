import Alpine from 'alpinejs'
import { API_URL, TWITCH_MAX_QUERY_COUNT, TWITCH_CLIENT_ID, SEARCH_COUNT, TOP_GAMES_COUNT, STREAMS_COUNT, USER_VIDEOS_COUNT, VideoType, twitchCatImageSrc, Game } from './common'
import { mainContent, UrlResolve, config } from 'config'
import 'htmx.org';
// import './libs/twinspark.js'

// TODO: Search: old value is visible when searching new


interface Stream {
  user_id: string,
  game_name: string,
  type: string,
}

interface ProfileImages {
  data: Record<string, {
    url: string
    last_access: number
  }>
  lastUpdate: number
  hasId: (id: string) => boolean
  init: () => void
  imgUrl: (user_id: string) => string
  setImage: (user_id: string, url: string) => void
  fetchProfileImages: (user_ids: string[]) => Promise<void>
  clean: (excludeIds: string[]) => void
  clear: () => void
}

interface Global {
  settings: Record<string, number | "on" | false>,
  clickedGame: string | null,
  clickedStream: string | null,
  setClickedGame: (name: string | null) => void,
  setClickedStream: (name: string | null) => void,
}

const setAriaMsg = (function() {
  const container = document.querySelector("#aria-feedback")!
  return (msg: string) => container.textContent = msg
})()

const twitch: {
  login_url: string;
  twitch_token: string | null;
  user_token: string | null;
  setTwitchToken: (token: string) => void;
  setUserToken: (token: string) => void;
  getToken: () => string | null;
  logout(): void;
} = {
  login_url: `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${window.location.origin + window.location.pathname}&response_type=token&scope=`,
  twitch_token: localStorage.getItem("twitch_token"),
  user_token: localStorage.getItem("user_token"),
  setTwitchToken: function(token: string): void {
    this.twitch_token = token
    localStorage.setItem("twitch_token", this.twitch_token)
  },
  setUserToken: function(token: string): void {
    this.user_token = token
    localStorage.setItem("user_token", this.user_token)
  },
  logout: function(): void {
    this.user_token = null
    localStorage.removeItem("user_token")
  },
  getToken: function(): string | null {
    return this.twitch_token || this.user_token
  },
}

class Twitch {
  static headers = {
    "Authorization": "",
    "Client-id": TWITCH_CLIENT_ID,
    "Accept": "application/vnd.twitchtv.v5+json",
  }

  client_id: string
  twitch_token: string | null = null
  is_fetching_token: boolean = false

  constructor(client_id: string) {
    this.client_id = client_id;
    this.twitch_token = localStorage.getItem("twitch_token");
    if (this.twitch_token) {
      this.setTwitchToken(this.twitch_token);
    }
  }
  async fetchToken() {
    let token = this.getTwitchToken();
    if (!token) {
      this.is_fetching_token = true;
      console.log("fetch new token")
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
}

const t = new Twitch(TWITCH_CLIENT_ID);
t.fetchToken();

const getUrlObject = (newPath: string): UrlResolve => {
  if (newPath === "/") return mainContent["top-games"]
  let contentKey = "not-found"
  const newDirs = newPath.split("/").filter((path) => path.length > 0)
  for (const key in mainContent) {
    const obj = mainContent[key]
    const dirs = obj.url.split("/").filter((path) => path.length > 0)
    if (dirs.length !== newDirs.length || dirs.length === 0) continue
    let isMatch = true
    for (let i = 0; i < dirs.length; i+=1) {
      const dir = dirs[i]
      if (dir[0] === ":") continue
      if (dir !== newDirs[i]) {
        isMatch = false
        break
      }
    }
    if (isMatch) {
      contentKey = key
      break
    }
  }
  return mainContent[contentKey]
}

const headers = {
  // "Host": "api.twitch.tv",
  "Authorization": `Bearer ${twitch.getToken()}`,
  "Client-id": TWITCH_CLIENT_ID,
  "Accept": "application/vnd.twitchtv.v5+json",
};

function menuItemToScrollPosition(menuitem: Element | undefined): Element | null {
  if (!menuitem) {
    menuitem = document.querySelector(".menu-item[aria-expanded=true]")!;
    if (!menuitem) return null;
  }
  let scroll_position = menuitem.nextElementSibling;
  while (scroll_position && !scroll_position.classList.contains("sidebar-position")) {
    scroll_position = scroll_position.nextElementSibling;
  }
  return scroll_position;
}

function alpineInit() {
  const fetchUsers = async (ids: string[]): Promise<any[]> => {
    if (ids.length === 0) return []
    const url = `https://api.twitch.tv/helix/users?id=${ids.join("&id=")}`;
    return (await (await fetch(url, {method: "GET", headers})).json()).data;
  }

  interface Search {
    name: string,
    id: string,
  }

  type SidebarState = "closed" | "games" | "streams" | "search"
  interface Sidebar {
    state: SidebarState,
    loading: boolean,
    searchValue: string,
    searchResults: Search[],
    init: () => void,
    closeSidebar: () => void,
    fetchSearch: (value: string) => Promise<Search[]>,
    clickSidebar: (sidebar: "category" | "user-videos", name: string) => void,
    toggleSidebar: (current: SidebarState) => void,
    getImageSrc: (url_template: string, width: number, height: number) => string,
    [key: string]: any,
  }

  document.addEventListener("alpine:init", function() {
    Alpine.data("sidebar", (): Sidebar => {
      const sidebarButtons: Record<string, HTMLElement> = {
        "games": document.querySelector("[data-menu-item='games']")!,
        "streams": document.querySelector("[data-menu-item='streams']")!,
        "search": document.querySelector("#game_name")!,
      }
      return {
        state: "closed",
        loading: false,
        searchValue: "",
        searchResults: [],
        init() {
          // Alpine.mutateDom(())
          // @ts-ignore
          let searchTimeout: NodeJS.Timeout = 0;
          let activeSidebar = (document.activeElement! as HTMLElement);
          Alpine.effect(() => {
            if (document.activeElement?.tagName === "BUTTON") {
              if (this.state === 'closed') {
                activeSidebar.focus();
              } else {
                activeSidebar = (document.activeElement! as HTMLElement);
              }
            }
          })
          Alpine.effect(() => {
            clearTimeout(searchTimeout)
            const searchTerm = this.searchValue.trim()
            if (searchTerm.length > 0) {
              this.loading = true;
              searchTimeout = setTimeout(async () => {
                let aria_msg = "Searching games"
                this.searchResults = await this.fetchSearch(searchTerm)
                this.loading = false;
                if (this.searchResults.length === 1) {
                  aria_msg = "Found one game"
                } else if (this.searchResults.length > 1) {
                  aria_msg = `Found ${this.searchResults.length} games`
                } else {
                  aria_msg = "Found no games"
                }
                if (this.state !== "closed") {
                  const scroll_position = menuItemToScrollPosition(sidebarButtons[this.state]);
                  if (scroll_position) {
                    window.requestAnimationFrame(function() {
                      const scrollbox = scroll_position.querySelector(".scrollbox")!;
                      sidebarShadows(scrollbox as HTMLElement);
                    });
                  }
                }
                setAriaMsg(aria_msg)
              }, 400)
            } else {
              this.searchResults = [];
            }
          })
        },
        async fetchSearch(value: string): Promise<Search[]> {
          const searchTerm = value.trim()
          if (searchTerm.length === 0) return []
          const url = `https://api.twitch.tv/helix/search/categories?first=${SEARCH_COUNT}&query=${searchTerm}`;
          const r = await fetch(url, { method: "GET", headers: headers })
          const results = await r.json()
          return results.data ?? []
        },
        closeSidebar() {
          sidebarButtons[this.state].focus()
          this.state = "closed";
        },
        clickSidebar(sidebar: "category" | "user-videos", name: string) {
          this.closeSidebar();
          if (sidebar === "category") {
            (Alpine.store("global") as Global).setClickedGame(name);
          } else if (sidebar === "user-videos") {
            (Alpine.store("global") as Global).setClickedStream(name);
          }
        },
        toggleSidebar(current: SidebarState) {
          if (this.state === current) {
            this.state = "closed"
            return
          }
          this.state = current

          const scroll_position = menuItemToScrollPosition(sidebarButtons[current]);
          if (scroll_position) {
            const scrollbox = scroll_position.querySelector(".scrollbox")!;
            sidebarShadows(scrollbox as HTMLElement);
          }
        },
        getImageSrc(url_template: string, width: number, height: number): string {
          return twitchCatImageSrc(url_template, width, height)
        },
      }
    })

    Alpine.data("userVideosFilter", (): any => {
      const outputList = document.querySelector(".user-videos")!
      return {
        toggleFilter(videoType: VideoType) {
          const outputClass = `no-${videoType}s`
          if (this.$el.classList.toggle("checked")) {
            outputList.classList.remove(outputClass)
          } else {
            outputList.classList.add(outputClass)
          }
        },
        onlyFilter(videoType: VideoType) {
          for (const btn of this.$root.querySelectorAll(".filter-checkbox-btn")) {
            btn.classList.remove("checked")
          }
          outputList.classList.add("no-highlights", "no-uploads", "no-archives")
          this.$el.previousElementSibling.classList.add("checked")
          outputList.classList.remove(`no-${videoType}s`)
        },
        showAll() {
          for (const btn of this.$root.querySelectorAll(".filter-checkbox-btn")) {
            btn.classList.add("checked")
          }
          outputList.classList.remove("no-highlights", "no-uploads", "no-archives")
        }
      }
    })

    Alpine.data("search", (): any => {
      return {
        stylesheet: null,
        init() {
          this.stylesheet = this.$el.insertAdjacentElement('afterend', document.createElement('style')).sheet
        },
        searchTitle() {
          this.formReset();
          const value = this.$el.value
          if (value.length === 0) return
          this.stylesheet.insertRule(`.filter-search > :not(li[data-title*='${escape(value)}' i]) { display: none !important }`, 0)
        },
        // used in 'partials/category.html'
        formReset() {
          if (this.stylesheet.cssRules.length) this.stylesheet.deleteRule(0)
        }
      }
    })

    const storeGames = {
      data: JSON.parse(localStorage.getItem("games") ?? "[]"),
      ids: [] as string[],
      init() {
        Alpine.effect(() => {
          const menu_item = document.querySelector(".menu-item[aria-expanded=true]")!;
          if (menu_item) {
            const scroll_position = menuItemToScrollPosition(menu_item);
            if (scroll_position) {
              const scrollbox = scroll_position.querySelector(".scrollbox")!;
              window.requestAnimationFrame(function() {
                sidebarShadows(scrollbox as HTMLElement);
              });
            }
          }
          this.ids = this.data.map(({id}:{id:string}) => id)
          localStorage.setItem("games", JSON.stringify(this.data))
        })
      },
      hasId(id: string): boolean {
        return this.ids.includes(id)
      },
      toggle(game: Game): boolean {
        if (this.hasId(game.id)) {
          this.remove(game.id)
          return false
        } else {
          this.add(game)
          return true
        }
      },
      add(game: Game) {
        let index = 0;
        for (const {name: dataName} of this.data) {
          if (game.name < dataName) break
          index += 1
        }
        this.data.splice(index, 0, game)
      },
      remove(id: string) {
        const index = this.ids.indexOf(id)
        if (index !== -1) {
          this.data.splice(index, 1)
        }
      },
      clear() { this.data = [] }
    }


    const fetchStreamsByUserIds = async (userIds: string[]): Promise<Stream[]> => {
      if (userIds.length === 0) return []
      const url = `https://api.twitch.tv/helix/streams?user_id=${userIds.join("&user_id=")}&first=${TWITCH_MAX_QUERY_COUNT}`;
      return (await (await fetch(url, {method: "GET", headers: headers})).json()).data;
    };

    interface StoreStreams {
      data: {user_id: string, user_login: string, user_name: string}[],
      ids: string[],
      live: Record<string, string>,
      liveLastCheck: number,
      init(): void,
      hasId(id: string): boolean,
      toggle(user_id: string, user_login: string, user_name: string): boolean,
      add(user_id: string, user_login: string, user_name: string): void,
      remove(id: string): void,
      isLive(user_id: string): boolean,
      addLiveUser(user_id: string): Promise<void>,
      updateUserLiveness(user_ids: string[]): Promise<void>,
      clear(): void
    }

    const keyStreams = "streams"
    const keyUserLive = `${keyStreams}.live`
    const keyUserLiveLastCheck = `${keyUserLive}.last_check`
    const livenessCheckTimeMs = 600000 // 10 minutes
    const storeStreams: StoreStreams = {
      data: JSON.parse(localStorage.getItem(keyStreams) ?? "[]"),
      ids: [] as string[],
      live: JSON.parse(localStorage.getItem("streams.live") ?? "{}"),
      liveLastCheck: parseInt(JSON.parse(localStorage.getItem(keyUserLiveLastCheck) ?? Date.now().toString()), 10),
      init() {
        Alpine.effect(() => {
          this.ids = this.data.map(({user_id}:{user_id:string}) => user_id)
          localStorage.setItem(keyStreams, JSON.stringify(this.data))
            const scroll_position = menuItemToScrollPosition(undefined);
            if (scroll_position) {
              window.requestAnimationFrame(function() {
                const scrollbox = scroll_position.querySelector(".scrollbox")!;
                sidebarShadows(scrollbox as HTMLElement);
              });
            }
        })
        Alpine.effect(() => {
          localStorage.setItem(keyUserLive, JSON.stringify(this.live))
        })
        Alpine.effect(() => {
          localStorage.setItem(keyUserLiveLastCheck, JSON.stringify(this.liveLastCheck))
        })

        // @ts-ignore
        let liveTimeout: NodeJs.Timeout = 0
        const queueUpdate = () => {
          this.updateUserLiveness(this.ids)
          liveTimeout = setTimeout(queueUpdate, livenessCheckTimeMs)
        }
        queueUpdate()
      },
      hasId(id: string): boolean {
        return this.ids.includes(id)
      },
      toggle(user_id: string, user_login: string, user_name: string): boolean {
        if (this.hasId(user_id)) {
          this.remove(user_id)
          return false
        } else {
          this.add(user_id, user_login, user_name)
          this.addLiveUser(user_id)
          return true
        }
      },
      add(user_id: string, user_login: string, user_name: string) {
        let index = 0;
        for (const {user_login: dataName} of this.data) {
          if (user_login < dataName) break
          index += 1
        }
        this.data.splice(index, 0, {user_id, user_login, user_name})
      },
      remove(id: string) {
        const index = this.ids.indexOf(id)
        if (index !== -1) {
          this.data.splice(index, 1)
        }
      },
      isLive(user_id: string): boolean {
        return this.live[user_id] !== undefined
      },
      async addLiveUser(user_id: string) {
        if (this.live[user_id] === undefined) {
          const stream = (await fetchStreamsByUserIds([user_id]))[0]
          if (stream) {
            this.live[stream.user_id] = stream.game_name
          }
        }
      },
      async updateUserLiveness(user_ids: string[]): Promise<void> {
        if (user_ids.length === 0) return
        const now = Date.now()
        const batch_count = Math.ceil(user_ids.length / TWITCH_MAX_QUERY_COUNT)
        let new_data: Record<string, string> = {}
        for (let i = 0; i < batch_count; i+=1) {
          const start = i * TWITCH_MAX_QUERY_COUNT
          const end = start + TWITCH_MAX_QUERY_COUNT
          const streams = await fetchStreamsByUserIds(user_ids.slice(start, end))
          for (const {user_id, game_name} of streams) {
            new_data[user_id] = game_name
          }
        }
        this.live = new_data
        this.liveLastCheck = now
      },
      clear() { this.data = [] }
    }

    type StreamImage = Record<string, {url: string, last_access: number}>

    const storeProfileImages: ProfileImages = {
      data: JSON.parse(localStorage.getItem("profile_images") ?? "{}"),
      lastUpdate: parseInt(JSON.parse(localStorage.getItem("profile_images_last_update") ?? Date.now().toString()), 10),
      init() {
        // Make sure $store.streams images exist
        const imageIds = Object.keys(this.data)
        const fetchIds = storeStreams.data.map(({user_id}:{user_id:string}) => user_id)
          .filter((id: string) => !imageIds.includes(id))
        this.fetchProfileImages(fetchIds)

        Alpine.effect(() => {
          localStorage.setItem("profile_images", JSON.stringify(this.data))
        })

        Alpine.effect(() => {
          localStorage.setItem("profile_images_last_update", JSON.stringify(this.lastUpdate))
        })
        window.addEventListener("unload", () => this.clean([]));
      },
      hasId(user_id: string): boolean {
        return this.data[user_id] !== undefined
      },
      imgUrl(user_id: string): string {
        const img = this.data[user_id]
        if (img) {
          img.last_access = Date.now()
          return img.url
        }
        return ""
      },
      setImage(user_id: string, url: string) {
        if (this.data[user_id]) return
        this.data[user_id] = {
          url: url,
          last_access: Date.now(),
        }
      },
      async fetchProfileImages(user_ids: string[]): Promise<void> {
        if (user_ids.length === 0) return
        const last_access = Date.now()
        const batch_count = Math.ceil(user_ids.length / TWITCH_MAX_QUERY_COUNT)

        for (let i = 0; i < batch_count; i+=1) {
          const start = i * TWITCH_MAX_QUERY_COUNT
          const end = start + TWITCH_MAX_QUERY_COUNT
          const profiles = await fetchUsers(user_ids.slice(start, end))
          let new_data: StreamImage = {}
          for (let {id, profile_image_url} of profiles) {
            new_data[id] = {
              url: profile_image_url,
              last_access: last_access,
            }
          }
          this.data = {...this.data, ...new_data}
        }
      },
      clean(excludeIds: string[] = []) {
        // Remove images that haven't been accessed more than maxAge
        // const maxAge = 518400000 // week in milliseconds
        const maxAge = 86400000 // day in milliseconds
        const nowDate = Date.now()
        const timePassedSinceLast = nowDate - this.lastUpdate
        if (timePassedSinceLast >= maxAge) {
          const images = Object.keys(this.data).filter((id) => !excludeIds.includes(id))
          for (let user_id of images) {
            if ((nowDate - this.data[user_id].last_access) > maxAge) {
              delete this.data[user_id]
            }
          }
        }
        this.lastUpdate = nowDate
      },
      clear() { this.data = {} }
    }


    Alpine.store("global", {
      settings: {
        "top-games-count": TOP_GAMES_COUNT,
        "category-count": STREAMS_COUNT,
        "user-videos-count": USER_VIDEOS_COUNT,
        "video-archives": "on",
        "video-uploads": false,
        "video-highlights": false,
      },
      twitch: twitch,
      mainContent: mainContent,
      init() {
        const settings_str = localStorage.getItem("settings")
        if (settings_str) {
          const settings = JSON.parse(settings_str)
          this.settings = { ...this.settings, ...settings }
        }
      },
      saveSettingsForm(el: HTMLFormElement) {
        let opts_obj: Record<string, any> = {};
        (new FormData(el)).forEach(function(value, key){ opts_obj[key] = value });
        this.settings = { ...this.settings, ...opts_obj }
        localStorage.setItem("settings", JSON.stringify(opts_obj))
      },
      async getLiveUserGame(user_id: string): Promise<string> {
        let result = (Alpine.store("streams")as StoreStreams).live[user_id] || ""
        if (!result) {
          const stream = (await fetchStreamsByUserIds([user_id]))[0]
          if (stream && stream.type === "live") {
            result = stream.game_name
          }
        }
        return result
      },
      clickedGame: null,
      clickedStream: null,
      setClickedGame(name: string | null) { this.clickedGame = name },
      setClickedStream(name: string | null) { this.clickedStream = name },
    } as Global)
    Alpine.store('games', storeGames)
    Alpine.store('streams', storeStreams)
    Alpine.store('profile_images', storeProfileImages)

  })
  Alpine.start()
}

const sidebarShadows = (scrollbox: HTMLElement) => {
    const scroll_container = scrollbox.closest('.scroll-container')!;
    const ul = scroll_container.querySelector("ul")!;
    const has_top_shadow = scrollbox.scrollTop > 0;  
    const has_bottom_shadow = scrollbox.scrollTop + scrollbox.offsetHeight < ul.offsetHeight
    let shadow_type = undefined;
    if (has_top_shadow && has_bottom_shadow) {
      shadow_type = "both";
    } else if (has_top_shadow) {
      shadow_type = "top";
    } else if (has_bottom_shadow) {
      shadow_type = "bottom";
    }
    if (shadow_type) {
      scroll_container.setAttribute("data-scroll-shadow", shadow_type);
    } else {
      scroll_container.removeAttribute("data-scroll-shadow");
    }
};



const handleSidebarScroll = () => {
  const scrollContainers = document.querySelectorAll('.scroll-container') as any;
  for (const scrollContainer of scrollContainers) {
    const scrollbox = scrollContainer.querySelector('.scrollbox');
    let scrolling = false;
    scrollbox.addEventListener("scroll", (event: Event) => {
      const scrollbox = event.target as HTMLElement

      if (!scrolling) {
        // TODO: need to fire this event when: 
        // 1) Amount of items changes. Only when sidebar open?
        window.requestAnimationFrame(function() {
          sidebarShadows(scrollbox);
          scrolling = false;
        });
        scrolling = true;
      }
    });
  }
}

const initHtmx = async () => {
  const global = Alpine.store("global") as Global

  htmx.defineExtension("twitch-api", {
    onEvent: (name: string, evt: any) => {
      // console.log(name, evt);
      if (name === "htmx:configRequest") {
        const path = evt.detail.path;
        const url = new URL(path, API_URL)
        evt.detail.path = url.toString();
        evt.detail.headers = Twitch.headers;

        if (url.pathname === "/helix/games/top") {
          evt.detail.parameters["first"] = global.settings["top-games-count"]
        } else if (url.pathname === "/helix/games") {
          let gameName = ""
          if (global.clickedGame) {
            gameName = global.clickedGame
          } else {
            const pathArr = location.pathname.split("/")
            gameName = decodeURIComponent(pathArr[pathArr.length - 1])
          }
          evt.detail.parameters["name"] = gameName
          global.setClickedGame(null)
        } else if (url.pathname === "/helix/streams") {
          const game_id = evt.detail.triggeringEvent.detail.game_id;
          if (game_id) {
            evt.detail.parameters.game_id = game_id;
          }
          evt.detail.parameters["first"] = global.settings["category-count"]
        }
      }
    },
    transformResponse: function(text: string, xhr: any, _elt: HTMLElement) {
      // console.log(text, xhr, _elt);
      const pathUrl = new URL(xhr.responseURL)
      const path = pathUrl.pathname;
      if (path === "/helix/games/top") {
        const json = JSON.parse(text);
        const tmpl = document.querySelector("#top-games-template") as HTMLTemplateElement;
        let result = "";
        for (const item of json.data) {
            const game_url = mainContent['category'].url.replace(":category", item.name)
            const img_url = twitchCatImageSrc(item.box_art_url, config.image.category.width, config.image.category.height);
            const game_obj_str = `{name: '${item.name}', id: '${item.id}', box_art_url: '${item.box_art_url}'}`;
            result += tmpl.innerHTML
              .replaceAll("#game_url", game_url)
              .replaceAll(":game_name", item.name)
              .replace("#game_img_url", img_url)
              .replace(":game_id", item.id)
              .replace(":json_game", game_obj_str)
        }
        const cursor = json.pagination.cursor;
        if (cursor) {
          document.querySelector("#param-after")!.setAttribute("value", cursor);
        }
        return result;
      } else if (path === "/helix/games") {
        const json = JSON.parse(text);
        const tmpl = (document.querySelector("#category-header-template") as HTMLTemplateElement);
        if (json.data.length >= 0) {
          const item = json.data[0];
          document.querySelector("#param-game_id")!.setAttribute("value", item.id);
          htmx.trigger("#load-more-streams", "click", {})
          let result = "";
          const img_url = twitchCatImageSrc(item.box_art_url, config.image.category.width, config.image.category.height);
          const game_obj_str = `{name: '${item.name}', id: '${item.id}', box_art_url: '${item.box_art_url}'}`;
          result += tmpl.innerHTML
            .replaceAll(":game_name", item.name)
            .replaceAll(":game_id", item.id)
            .replace("#game_img_url", img_url)
            .replace(":json_game", game_obj_str)
          return result;
        }
        return "TODO: category/game doesn't exist";
      } else if (path === "/helix/streams") {
        const json = JSON.parse(text);
        const tmpl = document.querySelector("#category-streams-template") as HTMLTemplateElement;
        let result = "";
        let user_ids = [];
        for (const item of json.data) {
            user_ids.push(item.user_id);
            const video_url = mainContent['user-videos'].url.replace(":user-videos", item.user_login)
            const img_url = twitchCatImageSrc(item.thumbnail_url, config.image.video.width, config.image.video.height);
            result += tmpl.innerHTML
              .replaceAll("#video_url", video_url)
              .replaceAll(":user_id", item.user_id)
              .replaceAll(":user_login", item.user_login)
              .replaceAll(":user_name", item.user_name)
              .replaceAll(":title", item.title)
              .replace(":viewer_count", item.viewer_count)
              .replace("#video_img_url", img_url)
              .replace(":title_encoded", encodeURIComponent(item.title))
        }
        
        const storeProfileImages = Alpine.store("profile_images") as ProfileImages
        const imageIds = Object.keys(storeProfileImages.data)
        user_ids = user_ids.filter((id: string) => !imageIds.includes(id))
        storeProfileImages.fetchProfileImages(user_ids)
        
        const cursor = json.pagination.cursor;
        if (cursor) {
          document.querySelector("#param-after")!.setAttribute("value", cursor);
        }
        return result;
      }
      return text;
    },
  });

  htmx.defineExtension("twitch-api1", {
    lastElem: null,
    onEvent: function(name: string, evt: any) {
      // console.log("Fired event: " + name, evt);
      const target = evt.detail.target
      const isVideoListSwap = target !== undefined && (target.id === 'list-top-games'
        || (target.classList !== undefined && target.classList.contains('filter-search')))
      if (name === "htmx:configRequest") {
        if (isVideoListSwap) {
          document.querySelector(".load-more-btn")?.setAttribute("aria-disabled", "true")
          if (this.lastElem !== null) {
            setAriaMsg("Loading more items")
          }
        }
        
        const token = twitch.getToken() || ""
        const path = evt.detail.path
        evt.detail.path = "/api/twitch-api"
        evt.detail.parameters["path"] = path
        evt.detail.parameters["token"] = token

        if (path === "/helix/games/top") {
          evt.detail.parameters["first"] = global.settings["top-games-count"]
        } else if (path === "/helix/games") {
          let gameName = ""
          if (global.clickedGame) {
            gameName = global.clickedGame
          } else {
            const pathArr = location.pathname.split("/")
            gameName = decodeURIComponent(pathArr[pathArr.length - 1])
          }
          evt.detail.parameters["name"] = gameName
          global.setClickedGame(null)
        } else if (path === "/helix/videos") {
          evt.detail.parameters["first"] = global.settings["user-videos-count"]
        } else if (path === "/helix/streams") {
          evt.detail.parameters["first"] = global.settings["category-count"]
        } else if (path === "/helix/users") {
          let loginName = ""
          if (global.clickedStream) {
            loginName = global.clickedStream
          } else {
            const pathArr = location.pathname.split("/")
            loginName = decodeURIComponent(pathArr[pathArr.length - 2])
          }
          evt.detail.parameters["login"] = loginName
          global.setClickedStream(null)
        }
      } else if (isVideoListSwap) {
        if (name === "htmx:beforeOnLoad") {
          this.lastElem = evt.detail.target.lastElementChild
        } else if (name === "htmx:afterOnLoad") {
          // Focus first new element if visible
          if (this.lastElem !== null) {
            setAriaMsg("Loading done")
            let elem = this.lastElem.nextElementSibling
            while (elem) {
              const styles = window.getComputedStyle(elem);
              if (styles.getPropertyValue("display") !== "none") {
                elem.setAttribute("tabindex", "-1")
                elem.focus()
                break;
              }
              elem = elem.nextElementSibling
            }
          }
          document.querySelector(".load-more-btn")?.setAttribute("aria-disabled", "false")

          const path = evt.target.getAttribute("hx-get")
          if (path === "/helix/streams") {
            // Get user ids to update/get profile images
            let elem = this.lastElem ? this.lastElem.nextElementSibling : evt.detail.target.children[0]
            let ids = []
            while (elem) {
              ids.push(elem.getAttribute("data-user-id"))
              elem = elem.nextElementSibling
            }
            const storeProfileImages = Alpine.store("profile_images") as ProfileImages
            const imageIds = Object.keys(storeProfileImages.data)
            ids = ids.filter((id: string) => !imageIds.includes(id))
            storeProfileImages.fetchProfileImages(ids)
          } else if (path === "/helix/videos") {
            // User page: Update filter counts
            const elHighlights = document.querySelector("#highlights-count")!;
            const elUploads = document.querySelector("#uploads-count")!;
            const elArchives = document.querySelector("#archives-count")!;

            elHighlights.textContent = evt.detail.target.querySelectorAll(".highlight").length
            elUploads.textContent = evt.detail.target.querySelectorAll(".upload").length
            elArchives.textContent = evt.detail.target.querySelectorAll(".archive").length
          }
        }
      } else if (name === "htmx:afterSwap") {
        if (evt.target.id === "param-game_id") {
          const pathUrl = new URL(evt.detail.xhr.responseURL)
          const path = pathUrl.searchParams.get("path")
          if (path === "/helix/games" && evt.detail.xhr.status === 200) {
            htmx.trigger("#load-more-streams", "click", {})
          }
        } else if (evt.target.id === "param-user_id") {
          const pathUrl = new URL(evt.detail.xhr.responseURL)
          const path = pathUrl.searchParams.get("path")
          if (path === "/helix/users" && evt.detail.xhr.status === 200) {
            htmx.trigger(".load-more-btn", "click", {})
          }
        }
      }
    },
    transformResponse: function(text: string, xhr: any, _elt: HTMLElement) {
      // console.log("xhr", xhr)
      // console.log("elt", _elt)
      const token = xhr.getResponseHeader("Twitch-Access-Token")
      if (token) {
        twitch.setTwitchToken(token)
        headers["Authorization"] = `Bearer ${token}`;
      }

      let result = text
      const pathUrl = new URL(xhr.responseURL)
      const path = pathUrl.searchParams.get("path")
      if (path === "/helix/games" && xhr.status !== 200) {
        const pathArr = location.pathname.split("/")
        result = `
          <h2>${decodeURIComponent(pathArr[pathArr.length - 1])}</h2>
          <div id="feedback" hx-swap-oob="true">Game/Category not found</div>
        `;
      } else if (path === "/helix/users" && xhr.status !== 200) {
        const pathArr = location.pathname.split("/")
        result = `
          <h2>${decodeURIComponent(pathArr[pathArr.length - 2])}</h2>
          <div id="feedback" hx-swap-oob="true">User not found</div>
        `;
      }

      return result
    },
  })

  htmx.ajax("GET", getUrlObject(location.pathname).html, "#main")
}

const init = async () => {
  // Save user access_token after login (settings page)
  if (window.location.hash) {
    for (const paramStr of window.location.hash.slice(1).split("&")) {
      const [key, token] = paramStr.split("=")
      if (key === "access_token") {
        twitch.setUserToken(token)
        location.hash = ""
        break
      }
    }
  }

  alpineInit()
  initHtmx()
  handleSidebarScroll()
}

init()
