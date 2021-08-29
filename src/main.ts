import Alpine from 'alpinejs'
import {addScopeToNode} from '../node_modules/alpinejs/src/scope.js'
import './style.css'

declare function addScopeToNode(node: Node, data: any, referenceNode: any): () => void

const clientId = "7v5r973dmjp0nd1g43b8hcocj2airz";

const paths: Record<string, string> = {
  "/": "/partials/top-games.html",
  "/directory/game/:name" : "/partials/category.html",
  "/:user/videos" : "/partials/user-videos.html",
  "/not-found" : "/partials/not-foudn.html",
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

const getSidebarTitle = (current: SidebarState): string => {
  switch (current) {
    case "games": return "Games";
    case "streams": return "Streams";
    case "search": return "Search";
  }
  return ""
}

function beforeAlpine(token: string) {
  const headers = {
    "Host": "api.twitch.tv",
    "Authorization": `Bearer ${token}`,
    "Client-id": clientId,
    "Accept": "application/vnd.twitchtv.v5+json",
  };

  interface Search {
    name: string,
    id: string,
  }
  document.addEventListener("alpine:initializing", () => {
    Alpine.data("sidebar", (): Sidebar => {
      return {
        // state: "closed",
        state: "streams",
        title: "",
        searchValue: "",
        searchResults: [] as Search[],
        init() {
          Alpine.effect(() => {
            const newTitle = getSidebarTitle(this.state)
            if (newTitle !== "") {
              this.title = newTitle
            }
          })
          let searchTimeout = 0;
          Alpine.effect(() => {
            clearTimeout(searchTimeout)
            const searchTerm = this.searchValue.trim()
            if (searchTerm.length > 0) {
              searchTimeout = setTimeout(async () => {
                this.searchResults = await this.fetchSearch(searchTerm)
              }, 400)
            }
          })
        },
        async fetchSearch(value: string): Promise<Search[]> {
          const searchTerm = value.trim()
          if (searchTerm.length === 0) return []
          const url = `https://api.twitch.tv/helix/search/categories?first=10&query=${searchTerm}`;
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
          const url = `https://api.twitch.tv/helix/games?name=${name}`;
          const data = (await (await fetch(url, {method: "GET", headers})).json()).data;
          if (data && data[0]) {
            const category = data[0]
            this.name = category.name
            this.id = category.id
            this.fetchVideos()
          }

        },
        async fetchVideos() {
          const count = 5
          const url = `https://api.twitch.tv/helix/streams?game_id=${this.id}&first=${count}&after=${this.cursor}`;
          const resp = await (await fetch(url, {method: "GET", headers})).json();
          this.videos= [...this.videos, ...resp.data]
          this.cursor= resp.pagination?.cursor ?? ""
        },
        getImageSrc(name: string, width: number, height: number): string {
          return twitchCategoryImageSrc(name, width, height)
        },
        createLiveUserImageUrl(url_template: string, w: number, h: number): string {
          return url_template.replace("{width}", w.toString()).replace("{height}", h.toString());
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
      const templ = this.$el?.querySelector('template')!
      const container = templ.parentElement!
      return {
        games: [] as TopGame[],
        cursor: "",
        loading: false,
        async init() {
          this.moreGames()
        },
        // TODO?: try to make for-append directive
        appendCategories(items: TopGame[]) {
          const tempContainer = document.createDocumentFragment()
          for (const item of items) {
            let categoryEl = document.importNode(templ.content, true).firstElementChild!
            addScopeToNode(categoryEl, {game: item}, templ)
            tempContainer.appendChild(categoryEl)
            Alpine.initTree(categoryEl)
          }
          Alpine.mutateDom(() => {
            container.appendChild(tempContainer)
          })
        },
        async moreGames(): Promise<void> {
          this.loading = true
          const r = await this.fetchCategories()
          this.appendCategories(r.data)
          this.cursor = r.pagination?.cursor ?? ""
          this.loading = false
        },
        async fetchCategories(): Promise<{data: TopGame[]}> {
          const url = `https://api.twitch.tv/helix/games/top?first=5&after=${this.cursor}`
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
    const fetchUsers = async (ids: string[]): Promise<any[]> => {
      if (ids.length === 0) return []
      const url = `https://api.twitch.tv/helix/users?id=${ids.join("&id=")}`;
      return (await (await fetch(url, {method: "GET", headers})).json()).data;
    }

    const TWITCH_MAX_QUERY_PARAMS = 100

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

    const storeStreams = {
      data: JSON.parse(localStorage.getItem("streams") ?? "[]"),
      ids: [] as string[],
      init() {
        Alpine.effect(() => {
          this.ids = this.data.map(({user_id}:{user_id:string}) => user_id)
          localStorage.setItem("streams", JSON.stringify(this.data))
        })
      },
      hasId(id: string): boolean {
        return this.ids.includes(id)
      },
      toggle(video: any): boolean {
        const id = video.user_id
        if (this.hasId(id)) {
          this.remove(id)
          return false
        } else {
          this.add(video)
          return true
        }
      },
      add(video: any) {
        const {user_id, user_login, user_name} = video
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
      async fetchProfileImages(user_ids: string[]): Promise<void> {
        if (user_ids.length === 0) return
        console.log("fetch images")
        const last_access = Date.now()
        const batch_count = Math.ceil(user_ids.length / TWITCH_MAX_QUERY_PARAMS)

        for (let i = 0; i < batch_count; i+=1) {
          const start = i * TWITCH_MAX_QUERY_PARAMS
          const end = start + TWITCH_MAX_QUERY_PARAMS
          const profiles = await fetchUsers(user_ids.slice(start, end))
          let new_data: StreamImage = {}
          for (let {id, profile_image_url} of profiles) {
            new_data[id] = {
              url: profile_image_url,
              last_access: last_access,
            }
          }
          this.data = {...this.data, ...new_data}
          console.log("fetch length", Object.keys(this.data).length)
        }
      },
      clean(excludeIds: string[] = []) {
        // Remove images that haven't been accessed more than a week
        const weekInMilliseconds = 518400000
        const nowDate = Date.now()
        const timePassedSinceLast = nowDate - this.lastUpdate
        if (timePassedSinceLast >= weekInMilliseconds) {
          const images = Object.keys(this.data).filter((id) => !excludeIds.includes(id))
          for (let user_id of images) {
            if ((nowDate - this.data[user_id].last_access) > weekInMilliseconds) {
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
    link.href = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${window.location.origin + window.location.pathname}&response_type=token&scope=`
  }
}

init()

