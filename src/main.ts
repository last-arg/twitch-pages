import Alpine from 'alpinejs'
import { API_URL, TWITCH_MAX_QUERY_COUNT, TWITCH_CLIENT_ID, SEARCH_COUNT, TOP_GAMES_COUNT, STREAMS_COUNT, USER_VIDEOS_COUNT, VideoType, twitchCatImageSrc, Game } from './common'
import { mainContent, UrlResolve, config } from 'config'
import 'htmx.org';
// import './libs/twinspark.js'

// TODO: Search: old value is visible when searching new

interface UserVideo {
  url: string,
  type: VideoType,
  duration: string,
  published_at: string,
  title: string,
  thumbnail_url: string,
}

function getVideoImageSrc(url: string, width: number, height: number): string {
  return url.replace('%{width}', width.toString()).replace('%{height}', height.toString())
}

const twitchDateToString = (d: Date): string => {
  const round = (nr: number): number => {
    const nr_floor = Math.floor(nr)
    return (nr - nr_floor) > 0.5 ? Math.ceil(nr) : nr_floor;
  }
  const seconds_f = (Date.now() - d.getTime()) / 1000
  const minutes_f = seconds_f / 60
  const hours_f = minutes_f / 60
  const days_f = hours_f / 24
  const minutes = round(minutes_f)
  const hours = round(hours_f)
  const days = round(days_f)
  const weeks = round(days_f / 7)
  const months = round(days_f / 30)
  const years = round(days_f / 365)

  let result_str = "1 minute ago"
  if (years > 0 && months > 11) {
    result_str = (years === 1) ? "1 year ago" : `${years} years ago`
  } else if (months > 0 && weeks > 4) {
    result_str = (months === 1) ? "1 month ago" : `${months} months ago`
  } else if (weeks > 0 && days > 6) {
    result_str = (weeks === 1) ? "1 week ago" : `${weeks} weeks ago`
  } else if (days > 0 && hours > 23) {
    result_str = (days === 1) ? "Yesterday" : `${days} days ago`
  } else if (hours > 0 && minutes > 59) {
    result_str = (hours === 1) ? "1 hour ago" : `${hours} hours ago`
  } else if (minutes > 1) {
    result_str = `${minutes} minutes ago`
  }

  return result_str
};

const twitchDurationToString = (duration: string): string => {
  const time = duration.slice(0,-1).split(/[hm]/).reverse()
  const hours = (time.length >= 3) ? `${time[2]}:` : ""
  const minutes = (time.length >= 2) ? `${time[1].padStart(2, "0")}:` : ""
  const seconds = (time.length >= 1) ? time[0].padStart(2, "0") : ""
  return `${hours}${minutes}${seconds}`
}


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
  
  setUserToken(token: string) {
    console.log("TODO: setUserToken")
  }
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
    return (await (await fetch(url, {method: "GET", headers: Twitch.headers})).json()).data;
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
    getImageSrc: (url_template: string) => string,
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
          const r = await fetch(url, { method: "GET", headers: Twitch.headers })
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
        getImageSrc(url_template: string): string {
          return twitchCatImageSrc(url_template, config.image.category.width, config.image.category.height)
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
          this.stylesheet.insertRule(`.filter-search > :not(li[data-title*='${encodeURIComponent(value)}' i]) { display: none !important }`, 0)
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
      return (await (await fetch(url, {method: "GET", headers: Twitch.headers})).json()).data;
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
      twitch: t,
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
          evt.detail.parameters["first"] = global.settings["category-count"]
        } else if (url.pathname === "/helix/users") {
          let loginName = ""
          if (global.clickedStream) {
            loginName = global.clickedStream
          } else {
            const pathArr = location.pathname.split("/")
            loginName = decodeURIComponent(pathArr[pathArr.length - 2])
          }
          evt.detail.parameters["login"] = loginName
          global.setClickedStream(null)
        } else if (path === "/helix/videos") {
          evt.detail.parameters["first"] = global.settings["user-videos-count"]
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
        if (xhr.status !== 200 || json.data.length === 0) {
          const pathArr = location.pathname.split("/")
          return `
            <h2>${decodeURIComponent(pathArr[pathArr.length - 1])}</h2>
            <div id="feedback" hx-swap-oob="true">Game/Category not found</div>
          `;
        }

        const tmpl = (document.querySelector("#category-header-template") as HTMLTemplateElement);
        const item = json.data[0];
        document.querySelector("#param-game_id")!.setAttribute("value", item.id);
        htmx.trigger("#load-more-streams", "click", {})
        let result = "";
        const img_url = twitchCatImageSrc(item.box_art_url, config.image.category.width, config.image.category.height);
        const game_obj_str = `{name: '${item.name}', id: '${item.id}', box_art_url: '${item.box_art_url}'}`;
        result += tmpl.innerHTML
          .replaceAll(":game_name", item.name)
          .replace(":game_id", item.id)
          .replace("#game_img_url", img_url)
          .replace(":json_game", game_obj_str)
        return result;
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
      } else if (path === "/helix/users") {
        const json = JSON.parse(text);
        if (xhr.status !== 200 || json.data.length === 0) {
          const pathArr = location.pathname.split("/")
          return `
            <h2>${decodeURIComponent(pathArr[1])}</h2>
            <div id="feedback" hx-swap-oob="true">User not found</div>
          `;
        }

        const tmpl = (document.querySelector("#user-header-template") as HTMLTemplateElement);
        const item = json.data[0];
        document.querySelector("#param-user_id")!.setAttribute("value", item.id);
        htmx.trigger("#load-more-streams", "click", {})
        let result = "";
        result += tmpl.innerHTML
          .replaceAll(":user_login", item.login)
          .replaceAll(":user_display_name", item.display_name)
          .replaceAll("#user_profile_image_url", item.profile_image_url)
          .replaceAll(":user_id", item.id)
        return result;
      } else if (path === "/helix/videos") {
        const VIDEO_ICONS: Record<string, string> = {
          archive: "video-camera",
          upload: "video-upload",
          highlight: "video-reel",
        }

        const json = JSON.parse(text);
        const tmpl = document.querySelector("#user-video-template") as HTMLTemplateElement;
        let result = "";
        const counts: any = { archive: 0, upload: 0, highlight: 0 };
        for (const item of json.data) {
            counts[item.type] += 1;
            const img_url = getVideoImageSrc(item.thumbnail_url, config.image.video.width, config.image.video.height);
            const date = new Date(item.published_at)
            result += tmpl.innerHTML
              .replaceAll(":video_title", item.title)
              .replace(":video_type", item.type)
              .replace("#video_url", item.url)
              .replace(":video_duration_str", twitchDurationToString(item.duration))
              .replace(":date_str", date.toString())
              .replace(":video_date_str", twitchDateToString(date))
              .replace(":video_type_title", item.type.toUpperCase())
              .replace("#img_url", img_url)
              .replace(":video_icon", VIDEO_ICONS[item.type])
              .replace(":encoded_video_title", encodeURIComponent(item.title));
        }
        
        // User page: Update filter counts
        const elHighlights = document.querySelector("#highlights-count")!;
        const elUploads = document.querySelector("#uploads-count")!;
        const elArchives = document.querySelector("#archives-count")!;

        const new_len_highlight = (+elHighlights.textContent!) + counts.highlight;
        const new_len_upload = (+elUploads.textContent!) + counts.upload;
        const new_len_archive = (+elArchives.textContent!) + counts.archive;
        
        elHighlights.textContent = new_len_highlight;
        elUploads.textContent = new_len_upload;
        elArchives.textContent = new_len_archive;
        
        const cursor = json.pagination.cursor;
        if (cursor) {
          document.querySelector("#param-after")!.setAttribute("value", cursor);
        }

        return result;
      }
      return text;
    },
  });

  htmx.ajax("GET", getUrlObject(location.pathname).html, "#main")
}

const init = async () => {
  // Save user access_token after login (settings page)
  if (window.location.hash) {
    for (const paramStr of window.location.hash.slice(1).split("&")) {
      const [key, token] = paramStr.split("=")
      if (key === "access_token") {
        t.setUserToken(token)
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
