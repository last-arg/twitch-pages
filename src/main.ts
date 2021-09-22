import Alpine from 'alpinejs'
import { TWITCH_MAX_QUERY_COUNT, TWITCH_CLIENT_ID, SEARCH_COUNT, STREAMS_COUNT, USER_VIDEOS_COUNT, TOP_GAMES_COUNT } from './common'
import './style.css'

const paths: Record<string, string> = {
  "/": "/partials/top-games.html",
  "/directory/game/:name" : "/partials/category.html",
  "/:user/videos" : "/partials/user-videos.html",
  "/not-found" : "/partials/not-found.html",
}

const resolveUrlPath = (): string => {
  let currentPath = "/not-found"
  let pathParams: Record<string, string> = {}
  if (location.pathname === "/") {
    currentPath = "/"
  } else {
    const urlDirs = location.pathname.split("/").filter((p) => p.length > 0)
    for (const path of Object.keys(paths)) {
      const pathDirs = path.split("/").filter((p) => p.length > 0)
      if (pathDirs.length === 0) continue
      if (pathDirs.length !== urlDirs.length) continue
      let matchPath = true
      let params: typeof pathParams = {}
      urlDirs.forEach((urlDirs, index) => {
        if (pathDirs[index][0] === ":") {
          params[pathDirs[index].slice(1)] = decodeURIComponent(urlDirs)
        } else if (urlDirs !== pathDirs[index]) {
          matchPath = false
        }
      })
      if (matchPath) {
        currentPath = path
        pathParams = params
        break
      }
    }
  }
  return currentPath
}

const resolveUrlGet = (): string => {
  return paths[resolveUrlPath()]
}

type SidebarState = "closed" | "games" | "streams" | "search"
interface Sidebar {
  state: SidebarState,
  [key: string]: any,
}

function beforeAlpine(token: string) {
  const headers = {
    "Host": "api.twitch.tv",
    "Authorization": `Bearer ${token}`,
    "Client-id": TWITCH_CLIENT_ID,
    "Accept": "application/vnd.twitchtv.v5+json",
  };

  const fetchUsers = async (ids: string[]): Promise<any[]> => {
    if (ids.length === 0) return []
    const url = `https://api.twitch.tv/helix/users?id=${ids.join("&id=")}`;
    return (await (await fetch(url, {method: "GET", headers})).json()).data;
  }

  const fetchUser = async (username: string): Promise<any | undefined> => {
    if (username.length === 0) return undefined
    const url = `https://api.twitch.tv/helix/users?login=${username}`;
    return (await (await fetch(url, {method: "GET", headers})).json()).data[0];
  }

  interface Search {
    name: string,
    id: string,
  }
  document.addEventListener("alpine:initializing", () => {
    const searchFeedback = document.querySelector("#search-feedback")
    Alpine.data("sidebar", (): Sidebar => {
      return {
        state: "closed",
        // state: "search",
        loading: false,
        searchValue: "",
        searchResults: [] as Search[],
        init() {
          let searchTimeout = 0;
          let activeSidebar: Element = document.activeElement;
          Alpine.effect(() => {
            const state = this.state;
            if (document.activeElement.tagName === "BUTTON") {
              if (this.state === 'closed') {
                activeSidebar.focus();
              } else {
                activeSidebar = document.activeElement;
              }
            }
          })
          Alpine.effect(() => {
            clearTimeout(searchTimeout)
            const searchTerm = this.searchValue.trim()
            if (searchTerm.length > 0) {
              this.loading = true;
              searchTimeout = setTimeout(async () => {
                searchFeedback.textContent = "Searching games"
                this.searchResults = await this.fetchSearch(searchTerm)
                this.loading = false;
                if (this.searchResults.length === 1) {
                  searchFeedback.textContent = `Found one game`
                } else if (this.searchResults.length > 1) {
                  searchFeedback.textContent = `Found ${this.searchResults.length} games`
                } else {
                  searchFeedback.textContent = `Found no games`
                }
              }, 400)
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
        toggleSidebar(current: SidebarState) {
          if (this.state === current) {
            this.state = "closed"
            return
          }
          this.state = current
        },
        getImageSrc(name: string, width: number, height: number): string {
          return twitchCategoryImageSrc(name, width, height)
        },
        sidebarToSvgIconId(state: SidebarState): string {
          switch (state) {
            case "games": return "game-controller";
            case "streams": return "people";
            case "search": return "looking-class";
          }
          return ""
        }
      }
    })

    interface Video {
      user_id: string,
      user_login: string,
      user_name: string,
      title: string,
      thumbnail_url: string,
      viewer_count: number,
    }
    Alpine.data("category", function(): any {
      return {
        id: "",
        name: "",
        videos: [] as Video[],
        cursor: "",
        loading: false,
        async init() {
          Alpine.effect(() => {
            if (this.videos.length > 0) {
              const current_ids = Object.keys(this.$store.profile_images.data)
              const fetch_ids = this.videos.map((v: Video) => v.user_id).filter((id: string) => !current_ids.includes(id))
              this.$store.profile_images.fetchProfileImages(fetch_ids)
            }
          })
          const pathArr = location.pathname.split("/")
          const name = decodeURIComponent(pathArr[pathArr.length - 1])
          this.name = name
          document.title = name
          this.loading = true
          const url = `https://api.twitch.tv/helix/games?name=${name}`;
          const data = (await (await fetch(url, {method: "GET", headers})).json()).data;
          if (data && data[0]) {
            const category = data[0]
            this.name = category.name
            this.id = category.id
            document.title = category.name
            this.fetchVideos()
          }
          this.loading = false
        },
        async fetchVideos() {
          this.loading = true
          const url = `https://api.twitch.tv/helix/streams?game_id=${this.id}&first=${STREAMS_COUNT}&after=${this.cursor}`;
          const resp = await (await fetch(url, {method: "GET", headers})).json();
          this.videos= [...this.videos, ...resp.data]
          this.cursor= resp.pagination?.cursor ?? ""
          this.loading = false
        },
        getImageSrc(name: string, width: number, height: number): string {
          return twitchCategoryImageSrc(name, width, height)
        },
        createLiveUserImageUrl(url_template: string, w: number, h: number): string {
          return url_template.replace("{width}", w.toString()).replace("{height}", h.toString());
        },
      }
    })

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

    interface UserVideo {
      url: string,
      type: "archive" | "upload" | "highlight",
      duration: string,
      published_at: string,
      title: string,
      thumbnail_url: string,
    }
    Alpine.data("user", function(): any {
      return {
        id: "",
        name: "",
        login: "",
        videos: [] as UserVideo[],
        cursor: "",
        loading: false,
        colors: {
          archive: "bg-lime-200",
          upload: "bg-sky-200",
          highlight: "bg-amber-200",
        },
        icons: {
          archive: "video-camera",
          upload: "video-upload",
          highlight: "video-reel",
        },
        titles: {
          archive: "Archive",
          upload: "Upload",
          highlight: "Highlight",
        },
        filterCount: {
          archive: 0,
          upload: 0,
          highlight: 0,
        },
        filter: {
          archive: true,
          upload: false,
          highlight: false,
        },
        onlyFilter(vType: UserVideo["type"]) {
          this.filter.archive = false
          this.filter.upload = false
          this.filter.highlight = false
          this.filter[vType] = true
        },
        toggleFilter(vType: UserVideo["type"]) {
          if (!this.filter[vType]) {
            this.filter[vType] = true
            return
          }

          const trueCount = Object.values(this.filter).reduce((acc: number, curr) => acc + Number(curr), 0)
          if (trueCount > 1) {
             this.filter[vType] = false
          }
        },
        async init() {
          Alpine.effect(() => {
            const filterCount = {
              archive: 0,
              upload: 0,
              highlight: 0,
            }

            for (const v of this.videos as UserVideo[]) {
              filterCount[v.type] += 1
            }
            this.filterCount = filterCount
          })
          this.loading = true
          const pathArr = location.pathname.split("/")
          const name = decodeURIComponent(pathArr[1])
          this.name = name

          const user = await fetchUser(name)
          if (user) {
            this.name = user.display_name

            this.login = user.login
            this.id = user.id
            document.title = this.name
            if (this.$store.profile_images.imgUrl(user.id) === "") {
              this.$store.profile_images.setImage(user.id, user.profile_image_url)
            }
            const resp = await this.fetchVideos()
            if (resp.data[0] && resp.data[0].thumbnail_url === "") {
              // When first video is current streaming video
              resp.data[0].thumbnail_url = "https://vod-secure.twitch.tv/_404/404_processing_320x180.png"
            }
            this.videos= [...this.videos, ...resp.data]
            this.cursor= resp.pagination?.cursor ?? ""
          }
          this.loading = false
        },
        async moreVideos() {
          this.loading = true
          const resp = await this.fetchVideos()
          this.videos= [...this.videos, ...resp.data]
          this.cursor= resp.pagination?.cursor ?? ""
          this.loading = false
        },
        async fetchVideos() {
          const url = `https://api.twitch.tv/helix/videos?user_id=${this.id}&first=${USER_VIDEOS_COUNT}&after=${this.cursor}`;
          return (await (await fetch(url, {method: "GET", headers})).json());
        },
        dateToRelative(str: Date): string {
          return twitchDateToString(str)
        },
        getImageSrc(url: string, width: number, height: number): string {
          return url.replace('%{width}', width.toString()).replace('%{height}', height.toString())
        },
      }
    })

    type AlpineEvent = CustomEventInit<any>

    Alpine.data("pathContent", function(): any {
      return {
        html: "",
        loading: false,
        async init() {
          this.loading = true;
          const mainElem = document.querySelector("main")

          window.addEventListener('set-main', async (e: AlpineEvent) => {
            if (e.detail.path === decodeURIComponent(location.pathname)) return
            this.loading = true;
            history.replaceState({html: this.html}, '',  location.pathname);
            const r = await fetch(e.detail.getUrl, {method: "GET"})
            // Always update main content
            Alpine.disableEffectScheduling(() => this.html = "")
            this.html = await r.text()
            history.pushState({html: this.html}, '',  e.detail.path);
            this.loading = false;
            mainElem.focus()
          })

          window.addEventListener('popstate', (e) => {
            // Always update main content when url changes
            Alpine.disableEffectScheduling(() => this.html = "")
            this.html = e.state.html
          })

          const r = await fetch(resolveUrlGet(), {method: "GET"})
          this.html = await r.text()
          history.replaceState({html: this.html}, '',  location.pathname);
          this.loading = false;
        },
      }
    })

    interface TopGame {
      name: string,
      id: string,
    }
    Alpine.data("topGames", function(this: AlpineMagicProperties): any {
      return {
        games: [] as TopGame[],
        cursor: "",
        loading: false,
        async init() {
          this.moreGames()
        },
        async moreGames(): Promise<void> {
          this.loading = true
          const r = await this.fetchCategories()
          this.games = [...this.games, ...r.data]
          this.cursor = r.pagination?.cursor ?? ""
          this.loading = false
        },
        async fetchCategories(): Promise<{data: TopGame[]}> {
          const url = `https://api.twitch.tv/helix/games/top?first=${TOP_GAMES_COUNT}&after=${this.cursor}`
          const r = await fetch(url, { method: "GET", headers: headers })
          return await r.json()
        },
        getImageSrc(name: string, width: number, height: number): string {
          return twitchCategoryImageSrc(name, width, height)
        },
      }
    })
  })

  document.addEventListener("alpine:init", function() {
    const storeGames = {
      data: JSON.parse(localStorage.getItem("games") ?? "[]"),
      ids: [] as string[],
      init() {
        Alpine.effect(() => {
          this.ids = this.data.map(({id}:{id:string}) => id)
          localStorage.setItem("games", JSON.stringify(this.data))
        })
      },
      hasId(id: string): boolean {
        return this.ids.includes(id)
      },
      toggle(id: string, name: string): boolean {
        if (this.hasId(id)) {
          this.remove(id)
          return false
        } else {
          this.add(id, name)
          return true
        }
      },
      add(id: string, name: string) {
        let index = 0;
        for (const {name: dataName} of this.data) {
          if (name < dataName) break
          index += 1
        }
        this.data.splice(index, 0, {id, name})
      },
      remove(id: string) {
        const index = this.ids.indexOf(id)
        if (index !== -1) {
          this.data.splice(index, 1)
        }
      }
    }

    interface Stream {
      user_id: string,
      game_name: string,
    }
    const fetchStreamsByUserIds = async (userIds: string[]): Promise<Stream[]> => {
      if (userIds.length === 0) return []
      const url = `https://api.twitch.tv/helix/streams?user_id=${userIds.join("&user_id=")}&first=${TWITCH_MAX_QUERY_COUNT}`;
      return (await (await fetch(url, {method: "GET", headers})).json()).data;
    };

    const keyStreams = "streams"
    const keyUserLive = `${keyStreams}.live`
    const keyUserLiveLastCheck = `${keyUserLive}.last_check`
    const storeStreams = {
      data: JSON.parse(localStorage.getItem(keyStreams) ?? "[]"),
      ids: [] as string[],
      live: JSON.parse(localStorage.getItem("streams.live") ?? "{}"),
      liveLastCheck: parseInt(JSON.parse(localStorage.getItem(keyUserLiveLastCheck) ?? Date.now().toString()), 10),
      init() {
        Alpine.effect(() => {
          this.ids = this.data.map(({user_id}:{user_id:string}) => user_id)
          localStorage.setItem(keyStreams, JSON.stringify(this.data))
        })
        Alpine.effect(() => {
          localStorage.setItem(keyUserLive, JSON.stringify(this.live))
        })
        Alpine.effect(() => {
          localStorage.setItem(keyUserLiveLastCheck, JSON.stringify(this.liveLastCheck))
        })

        // @ts-ignore
        let liveTimeout = 0
        const fiveMinutesInMs = 300000
        const queueUpdate = () => {
          this.updateUserLiveness(this.ids)
          liveTimeout = setTimeout(queueUpdate, fiveMinutesInMs)
        }
        liveTimeout = setTimeout(queueUpdate, fiveMinutesInMs)
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
            this.live[stream.user_id] =stream.game_name
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
      }
    }

    type StreamImage = Record<string, {url: string, last_access: number}>

    const storeProfileImages = {
      data: JSON.parse(localStorage.getItem("profile_images") ?? "{}"),
      lastUpdate: parseInt(JSON.parse(localStorage.getItem("profile_images_last_update") ?? Date.now().toString()), 10),
      init() {
        // Make sure $store.streams images exist
        const imageIds = Object.keys(this.data)
        const fetchIds = storeStreams.data.map(({user_id}:{user_id:string}) => user_id)
          .filter((id: string) => !imageIds.includes(id))
        if (fetchIds.length > 0) {
            this.fetchProfileImages(fetchIds)
        }

        Alpine.effect(() => {
          localStorage.setItem("profile_images", JSON.stringify(this.data))
        })

        Alpine.effect(() => {
          localStorage.setItem("profile_images_last_update", JSON.stringify(this.lastUpdate))
        })
        window.addEventListener("unload", () => this.clean());
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
      }
    }

    Alpine.store('games', storeGames)
    Alpine.store('streams', storeStreams)
    Alpine.store('profile_images', storeProfileImages)
  })
}

const twitchCategoryImageSrc = (name: string, width: number, height: number): string => {
  return `https://static-cdn.jtvnw.net/ttv-boxart/${name}-${width}x${height}.jpg`;
}

const init = async () => {
  // Get token
  let token = localStorage.getItem("twitch_token")
  if (window.location.hash) {
    for (const paramStr of window.location.hash.slice(1).split("&")) {
      const [key, value] = paramStr.split("=")
      if (key === "access_token") {
        token = value
        localStorage.setItem("twitch_token", value)
        break
      }
    }
  }

  // Init
  if (token) {
    beforeAlpine(token)
    Alpine.start()
  } else {
    // initLogin()
    const link = document.querySelector<HTMLLinkElement>(".js-twitch-login")!
    link.parentElement?.classList.remove("hidden")
    link.href = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${window.location.origin + window.location.pathname}&response_type=token&scope=`
  }
}

init()

