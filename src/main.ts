import Alpine from 'alpinejs'
import { TWITCH_MAX_QUERY_COUNT, TWITCH_CLIENT_ID, SEARCH_COUNT } from './common'
import { mainContent, urlRoot, UrlResolve } from 'config'
import './style.css'
import 'htmx.org';
// import './libs/twinspark.js'

interface Stream {
  user_id: string,
  game_name: string,
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
}

interface Global {
  urlRoot: string,
  clickedGame: string | null,
  clickedStream: string | null,
  setClickedGame: (name: string | null) => void,
  setClickedStream: (name: string | null) => void,
}

const getUrlObject = (newPath: string): UrlResolve => {
  if (newPath === urlRoot) return mainContent["top-games"]
  let contentKey = "not-found"
  const newDirs = newPath.split("/").filter((p) => p.length > 0)
  for (const key in mainContent) {
    const obj = mainContent[key]
    const dirs = obj.url.split("/").filter((p) => p.length > 0)
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

function alpineInit(token: string) {
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
    clickSidebarGame: (name: string) => void,
    clickSidebarStream: (name: string) => void,
    toggleSidebar: (current: SidebarState) => void,
    getImageSrc: (name: string, width: number, height: number) => string,
    [key: string]: any,
  }

  document.addEventListener("alpine:init", function() {
    const searchFeedback = document.querySelector("#search-feedback")!
    Alpine.data("sidebar", (): Sidebar => {
      const sidebarButtons: Record<string, HTMLElement> = {
        "games": document.querySelector(".sidebar-button[aria-label='Games']")!,
        "streams": document.querySelector(".sidebar-button[aria-label='Streams']")!,
        "search": document.querySelector(".search-wrapper button")!,
      }
      return {
        state: "closed",
        loading: false,
        searchValue: "",
        searchResults: [],
        init() {
          // Alpine.mutateDom(())
          let searchTimeout = 0;
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
        closeSidebar() {
          sidebarButtons[this.state].focus()
          this.state = "closed";
        },
        clickSidebarGame(name: string) {
          this.closeSidebar();
          (Alpine.store("global") as Global).setClickedGame(name);
        },
        clickSidebarStream(name: string) {
          this.closeSidebar();
          (Alpine.store("global") as Global).setClickedStream(name);
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

    Alpine.data("userVideosFilter", (): any => {
      const outputList = document.querySelector("#video-list")!
      return {
        toggleFilter(videoType: VideoType) {
          const outputClass = `show-${videoType}s`
          if (this.$el.classList.toggle("checked")) {
            outputList.classList.add(outputClass)
          } else {
            outputList.classList.remove(outputClass)
          }
        },
        onlyFilter(videoType: VideoType) {
          for (const btn of this.$root.querySelectorAll(".filter-checkbox-btn")) {
            btn.classList.remove("checked")
          }
          outputList.classList.remove("show-highlights", "show-uploads", "show-archives")
          this.$el.previousElementSibling.classList.add("checked")
          outputList.classList.add(`show-${videoType}s`)
        },
        showAll() {
          for (const btn of this.$root.querySelectorAll(".filter-checkbox-btn")) {
            btn.classList.add("checked")
          }
          outputList.classList.add("show-highlights", "show-uploads", "show-archives")
        }
      }
    })

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


    const fetchStreamsByUserIds = async (userIds: string[]): Promise<Stream[]> => {
      if (userIds.length === 0) return []
      const url = `https://api.twitch.tv/helix/streams?user_id=${userIds.join("&user_id=")}&first=${TWITCH_MAX_QUERY_COUNT}`;
      return (await (await fetch(url, {method: "GET", headers})).json()).data;
    };

    const keyStreams = "streams"
    const keyUserLive = `${keyStreams}.live`
    const keyUserLiveLastCheck = `${keyUserLive}.last_check`
    const fiveMinutesInMs = 300000
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
        const queueUpdate = () => {
          this.updateUserLiveness(this.ids)
          liveTimeout = setTimeout(queueUpdate, fiveMinutesInMs)
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

    const storeProfileImages: ProfileImages = {
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


    Alpine.store("global", {
      urlRoot: urlRoot,
      clickedGame: null,
      clickedStream: null,
      setClickedGame(name: string | null) {
        this.clickedGame = name
      },
      setClickedStream(name: string | null) {
        this.clickedStream = name
      },
    } as Global)
    Alpine.store('games', storeGames)
    Alpine.store('streams', storeStreams)
    Alpine.store('profile_images', storeProfileImages)

  })
}

const handleSidebarScroll = () => {
  const scrollBoxes = document.querySelectorAll('.scrollbox') as any
  for (const box of scrollBoxes) {
    const scrollContainer = box.closest('.scroll-container')
    const ul = box.querySelector('ul');
    let scrolling = false;
    const setShadow = (event: Event) => {
      if (!scrolling) {
        const elem = event.target as HTMLElement
        window.requestAnimationFrame(function() {
          if (elem.scrollTop > 0) {
            scrollContainer.classList.add('has-top-shadow');
          } else {
            scrollContainer.classList.remove('has-top-shadow');
          }
          if (elem.scrollTop + elem.offsetHeight < ul.offsetHeight) {
            scrollContainer.classList.add('has-bottom-shadow');
          } else {
            scrollContainer.classList.remove('has-bottom-shadow');
          }
          scrolling = false;
        });
        scrolling = true;
      }
    };
    box.addEventListener("scroll", setShadow)
  }
}

const twitchCategoryImageSrc = (name: string, width: number, height: number): string => {
  return `https://static-cdn.jtvnw.net/ttv-boxart/${name}-${width}x${height}.jpg`;
}

function getImageSrc(name: string, width: number, height: number): string {
  return twitchCategoryImageSrc(name, width, height)
}

function createLiveUserImageUrl(url_template: string, w: number, h: number): string {
  return url_template.replace("{width}", w.toString()).replace("{height}", h.toString());
}

const CAT_IMG_WIDTH = 104
const CAT_IMG_HEIGHT = 144
const VIDEO_IMG_WIDTH = 440
const VIDEO_IMG_HEIGHT = 248

interface TopGame {
  name: string,
  id: string,
}

const topGamesTransform = (games: TopGame[]) => {
  let result = ""
  for (const game of games) {
    result += `
      <li class="fade-in flex">
        <div class="flex w-full border-2 border-white">
          <a href="${urlRoot}/directory/game/${game.name}"
            hx-push-url="${urlRoot}/directory/game/${game.name}"
            hx-get="${mainContent['category'].html}" hx-target="#main"
            class="flex flex-grow items-center bg-white hover:text-violet-700 hover:underline"
            @click="$store.global.setClickedGame('${game.name}')"
          >
            <img class="w-16" src="${getImageSrc(game.name, CAT_IMG_WIDTH, CAT_IMG_HEIGHT)}" alt="" width="${CAT_IMG_WIDTH}" height="${CAT_IMG_HEIGHT}">
            <p class="ml-2 text-lg">${game.name}</p>
          </a>
          <div class="bg-trueGray-100 text-trueGray-400 flex flex-col justify-between p-2">
            <button x-data="{followed: false}"
              class="hover:text-violet-700"
              x-effect="followed = $store.games.hasId('${game.id}')"
              x-on:click="$store.games.toggle('${game.id}', '${game.name}')"
              :aria-label="followed ? 'UnFollow' : 'Follow'"
            >
              <svg class="fill-current w-5 h-5">
                <use x-show="!followed" href="${urlRoot}/assets/icons.svg#star-empty"></use>
                <use x-show="followed" href="${urlRoot}/assets/icons.svg#star-full"></use>
              </svg>
            </button>
            <a class="hover:text-violet-700"
              href="https://www.twitch.tv/directory/games/${game.name}" aria-label="Game's Twitch page"
            >
              <svg class="fill-current w-5 h-5">
                <use href="${urlRoot}/assets/icons.svg#external-link"></use>
              </svg>
            </a>
          </div>
        </div>
      </li>
    `
  }

  return result
}

const categoryTransform = (json: any) => {
  const game = json.data[0]
  return `
    <h2>
      <a class="flex items-center text-lg group block pr-3
          hover:underline hover:text-violet-700
          focus:underline focus:text-violet-700
        "
        href="https://www.twitch.tv/directory/game/${game.name}"
      >
        <img class="w-10" src="${getImageSrc(game.name, CAT_IMG_WIDTH, CAT_IMG_HEIGHT)}" width="${CAT_IMG_WIDTH}" height="${CAT_IMG_HEIGHT}">
        <p class="line-clamp-2 pl-3">${game.name}</p>
        <svg class="flex-none fill-current w-4 h-4 ml-2 text-violet-400 group-hover:text-violet-700 group-focus:text-violet-700">
          <use href="${urlRoot}/assets/icons.svg#external-link"></use>
        </svg>
      </a>
    </h2>
    <div class="border-l-2 border-trueGray-50 h-full"></div>
    <button x-data="{followed: false}"
      class="text-gray-400 hover:text-violet-700 transition duration-100 px-3" type="button"
      x-effect="followed = $store.games.hasId('${game.id}')"
      aria-label="followed ? 'UnFollow' : 'Follow'"
      x-on:click="$store.games.toggle('${game.id}', '${game.name}')"
    >
      <svg class="fill-current w-5 h-5">
        <use x-show="!followed" href="${urlRoot}/assets/icons.svg#star-empty"></use>
        <use x-show="followed" href="${urlRoot}/assets/icons.svg#star-full"></use>
      </svg>
    </button>
  `
}

interface Video {
  user_id: string,
  user_login: string,
  user_name: string,
  title: string,
  thumbnail_url: string,
  viewer_count: number,
}

const streamsTransform = (streams: Video[]) => {
  let result = ""
  for (const stream of streams) {
    const videoUrl = `${urlRoot}/${stream.user_login}/videos`
    result += `
      <li class="fade-in">
        <div>
          <a href="https://twitch.tv/${stream.user_login}" title="${stream.title}"
            class="hover:text-violet-700 hover:underline"
          >
            <div class="relative">
              <img class="rounded" src="${createLiveUserImageUrl(stream.thumbnail_url, VIDEO_IMG_WIDTH, VIDEO_IMG_HEIGHT)}" alt="" width="${VIDEO_IMG_WIDTH}" height="${VIDEO_IMG_HEIGHT}" />
              <p class="absolute bottom-0 left-0 bg-trueGray-800 text-trueGray-100 text-sm px-1 rounded-sm mb-1 ml-1">${stream.viewer_count} viewers</p>
            </div>
            <div class="flex items-center px-1 py-1 rounded bg-white">
              <p class="truncate">${stream.title}</p>
              <svg class="ml-1 flex-none fill-current w-4 h-4">
                <use href="${urlRoot}/assets/icons.svg#external-link"></use>
              </svg>
            </div>
          </a>
          <div class="flex bg-white rounded px-1 py-1.5 border-t-2 border-trueGray-50">
            
            <a aria-hidden="true" href="${videoUrl}"
              hx-push-url="${videoUrl}" hx-get="${mainContent['user-videos'].html}" hx-target="#main"
              @click="$store.global.setClickedStream('${stream.user_login}')"
            >
              <img class="w-14 border border-trueGray-200 hover:border-violet-700" :src="$store.profile_images.imgUrl('${stream.user_id}')" alt="" width="300" height="300">
            </a>
            <div class="stack stack-m-0 ml-2">
              <div class="flex items-center mb-auto">
                <a class="hover:underline hover:text-violet-700" href="${videoUrl}"
                  hx-push-url="${videoUrl}" hx-get="${mainContent['user-videos'].html}" hx-target="#main"
                  @click="$store.global.setClickedStream('${stream.user_login}')"
                >${stream.user_name}</a>
                <div class="ml-4 mr-2 border-l h-6 w-0 border-trueGray-300"></div>
                <button type="button"
                  class="text-gray-400 hover:text-violet-700"
                  x-on:click="$store.streams.toggle('${stream.user_id}', '${stream.user_login}', '${stream.user_name}')"
                >
                  <svg class="fill-current w-5 h-5">
                    <use x-show="!$store.streams.hasId('${stream.user_id}')" href="${urlRoot}/assets/icons.svg#star-empty"></use>
                    <use x-show="$store.streams.hasId('${stream.user_id}')" href="${urlRoot}/assets/icons.svg#star-full"></use>
                  </svg>
                </button>
              </div>
              <a class="flex items-center hover:underline hover:text-violet-700"
                href="https://www.twitch.tv/${stream.user_login}/videos"
              >
                <p>Go to Twitch videos</p>
                <svg class="fill-current w-4 h-4 ml-1">
                  <use href="${urlRoot}/assets/icons.svg#external-link"></use>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </li>
    `
  }
  return result
}

const userTransform = (json: any) => {
  const user = json.data[0]
  return `
    <h2>
      <a
        class="flex items-center text-lg group block
          hover:underline hover:text-violet-700
          focus:underline focus:text-violet-700
        "
        href="https://www.twitch.tv/${user.login}/videos"
      >
        <img class="block w-10 mr-3" :src="$store.profile_images.imgUrl('${user.id}')" width="300" height="300">
        <p>${user.display_name}</p>
        <svg class="fill-current w-4 h-4 ml-2 text-violet-400 group-hover:text-violet-700 group-focus:text-violet-700">
          <use href="${urlRoot}/assets/icons.svg#external-link"></use>
        </svg>
      </a>
    </h2>
    <div class="ml-6 mr-2 border-l-2 border-trueGray-50 place-self-stretch"></div>
    <button x-data="{followed: false}"
      class="text-gray-400 hover:text-violet-700" type="button"
      x-effect="followed = $store.streams.hasId('${user.id}')"
      aria-label="followed ? 'UnFollow' : 'Follow'"
      x-on:click="$store.streams.toggle('${user.id}', '${user.login}', '${user.display_name}')"
    >
      <svg class="fill-current w-5 h-5">
        <use x-show="!followed" href="${urlRoot}/assets/icons.svg#star-empty"></use>
        <use x-show="followed" href="${urlRoot}/assets/icons.svg#star-full"></use>
      </svg>
    </button>
   `
}

type VideoType = "archive" | "upload" | "highlight"

interface UserVideo {
  url: string,
  type: VideoType,
  duration: string,
  published_at: string,
  title: string,
  thumbnail_url: string,
}

const VIDEO_COLORS: Record<string, string> = {
  archive: "bg-lime-200",
  upload: "bg-sky-200",
  highlight: "bg-amber-200",
}

const VIDEO_TITLES: Record<string, string> = {
  archive: "Archive",
  upload: "Upload",
  highlight: "Highlight",
}

const VIDEO_ICONS: Record<string, string> = {
  archive: "video-camera",
  upload: "video-upload",
  highlight: "video-reel",
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

function getVideoImageSrc(url: string, width: number, height: number): string {
  return url.replace('%{width}', width.toString()).replace('%{height}', height.toString())
}

const twitchDurationToString = (duration: string): string => {
  const time = duration.slice(0,-1).split(/[hm]/).reverse()
  const hours = (time.length >= 3) ? `${time[2]}:` : ""
  const minutes = (time.length >= 2) ? `${time[1].padStart(2, "0")}:` : ""
  const seconds = (time.length >= 1) ? time[0].padStart(2, "0") : ""
  return `${hours}${minutes}${seconds}`
}

const videosTransform = (videos: UserVideo[]) => {
  let result = ""
  for (const video of videos) {
    const date = new Date(video.published_at)
    result += `
      <li class="fade-in ${video.type}">
        <a class="block group" href="${video.url}" title="${video.title}">
          <div class="relative">
          <img class="w-full rounded-sm" src="${getVideoImageSrc(video.thumbnail_url, VIDEO_IMG_WIDTH, VIDEO_IMG_HEIGHT)}" alt="" width="${VIDEO_IMG_WIDTH}" height="${VIDEO_IMG_HEIGHT}" />
            <span class="opacity-90 absolute top-0 left-0 mt-1.5 ml-1.5 px-0.5 rounded-sm ${VIDEO_COLORS[video.type]}"
              title="${VIDEO_TITLES[video.type]}"
            >
              <svg class="fill-current w-4 h-4">
                <use href="${urlRoot}/assets/icons.svg#${VIDEO_ICONS[video.type]}"></use>
              </svg>
            </span>
            <div class="absolute bottom-0 left-0 flex justify-between w-full mb-1.5 text-gray-50">
              <span class="px-1 ml-1.5 text-sm bg-gray-800 rounded-sm bg-opacity-70"
              >${twitchDurationToString(video.duration)}</span>
              <span class="px-1 mr-1.5 text-sm bg-gray-800 rounded-sm bg-opacity-70"
                title="${date.toString()}"
              >${twitchDateToString(date)}</span>
            </div>
          </div>
          <div class="rounded-sm flex items-center bg-white group-hover:text-violet-700 group-hover:underline px-1">
            <p class="truncate flex-grow">${video.title}</p>
            <svg class="flex-none ml-1 fill-current w-4 h-4">
              <use href="${urlRoot}/assets/icons.svg#external-link"></use>
            </svg>
          </div>
        </a>
      </li>
    `
  }
  return result
}

const initHtmx = async (token: string) => {
  htmx.defineExtension("twitch-api", {
    lastElem: null,
    onEvent: function(name: string, evt: any) {
      // console.log("Fired event: " + name, evt.target);
      const isVideoListSwap = evt.detail.target !== undefined && evt.detail.target.id === "video-list" || evt.target.id === "video-list-swap"
      if (name === "htmx:configRequest") {
        // console.log("config details", evt.detail)
        if (isVideoListSwap) {
          document.querySelector(".load-more-btn")?.setAttribute("aria-disabled", "true")
        }
        evt.detail.headers["HX-Current-URL"] = null;
        evt.detail.headers["HX-Request"] = null;
        evt.detail.headers["HX-Target"] = null;
        evt.detail.headers["HX-Trigger"] = null;
        evt.detail.headers["Authorization"] = `Bearer ${token}`;
        evt.detail.headers["Client-id"] = TWITCH_CLIENT_ID;
        evt.detail.headers["Accept"] = "application/vnd.twitchtv.v5+json";
        const pathUrl = new URL(evt.detail.path)
        if (pathUrl.pathname === "/helix/games") {
          const global = Alpine.store('global') as Global
          let gameName = ""
          if (global.clickedGame) {
            gameName = global.clickedGame
          } else {
            const pathArr = location.pathname.split("/")
            gameName = decodeURIComponent(pathArr[pathArr.length - 1])
          }
          evt.detail.parameters["name"] = gameName
          global.setClickedGame(null)
        } else if (pathUrl.pathname === "/helix/users") {
          const global = Alpine.store('global') as Global
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
        // Focus first new element if visible
        if (name === "htmx:beforeOnLoad") {
          this.lastElem = evt.detail.target.lastElementChild
        } else if (name === "htmx:afterOnLoad") {
          if (this.lastElem !== null) {
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
        }
      }
    },
    transformResponse: function(text: string, xhr: any, _elt: HTMLElement) {
      // console.log(xhr, _elt)
      // console.log("elt", _elt)
      const json = JSON.parse(text)
      let result = ""
      const pathUrl = new URL(xhr.responseURL)
      if (pathUrl.pathname === "/helix/games") {
        if (xhr.status === 200) {
          document.querySelector(".category-param[name='game_id']")?.setAttribute("value", json.data[0].id)

          htmx.trigger("#load-more-streams", "click", {})
          result = categoryTransform(json)
        } else {
          const pathArr = location.pathname.split("/")
          result = `
            <h2 class="text-lg px-3 py-2">${decodeURIComponent(pathArr[pathArr.length - 1])}</h2>
            <div id="feedback" hx-swap-oob="true">Game/Category not found</div>
          `;
        }
      } else if (pathUrl.pathname === "/helix/games/top") {
        result = topGamesTransform(json.data as TopGame[])
        if (json.pagination && json.pagination.cursor) {
          result += `<input type="hidden" id="top-games-params" hx-swap-oob="true" name="after" value="${json.pagination.cursor}">`
        }
      } else if (pathUrl.pathname === "/helix/streams") {
        if (json.data.length > 0) {
          const storeProfileImages = Alpine.store("profile_images") as ProfileImages
          const user_ids: string[] = json.data.reduce((prev: string[], curr: Video) => {
            if (!storeProfileImages.hasId(curr.user_id)) {
              return prev.concat(curr.user_id)
            }
            return prev
          }, [])
          storeProfileImages.fetchProfileImages(user_ids )
          result = streamsTransform(json.data as Video[])
          if (json.pagination !== undefined && json.pagination.cursor) {
            document.querySelector(".category-param[name='after']")?.setAttribute("value", json.pagination.cursor)
          }
        } else {
          result = `<div id="feedback" hx-swap-oob="true">Found no live streams</div>`
        }
      } else if (pathUrl.pathname === "/helix/users") {
        if (xhr.status === 200) {
          const user_id = json.data[0].id
          window.dispatchEvent(
            new CustomEvent("fetchProfileImages", {detail: [user_id]})
          )
          document.querySelector(".req-param[name='user_id']")?.setAttribute("value", user_id)
          htmx.trigger(".load-more-btn", "click", {})
          result = userTransform(json)
        } else {
          const pathArr = location.pathname.split("/")
          result = `
            <h2 class="text-lg px-3 py-2">${decodeURIComponent(pathArr[pathArr.length - 2])}</h2>
            <div id="feedback" hx-swap-oob="true">User not found</div>
          `;
        }
      } else if (pathUrl.pathname === "/helix/videos") {
        if (json.data.length > 0) {
          result = videosTransform(json.data as UserVideo[])
          if (json.pagination !== undefined && json.pagination.cursor) {
            document.querySelector(".req-param[name='after']")?.setAttribute("value", json.pagination.cursor)
          }
          const elHighlights = document.querySelector("#highlights-count")!;
          const elUploads = document.querySelector("#uploads-count")!;
          const elArchives = document.querySelector("#archives-count")!;
          const counts: Record<string, number> = {
            "archives": parseInt(elArchives.textContent!, 10) ?? 0,
            "uploads": parseInt(elUploads.textContent!, 10) ?? 0,
            "highlights": parseInt(elHighlights.textContent!, 10) ?? 0,
          }
          for (const video of json.data) {
            if (video.type === "archive") {
              counts.archives += 1
            } else if (video.type === "upload") {
              counts.uploads += 1
            } else if (video.type === "highlight") {
              counts.highlights += 1
            }
          }
          elHighlights.textContent = counts.highlights.toString()
          elUploads.textContent = counts.uploads.toString()
          elArchives.textContent = counts.archives.toString()
        } else {
          result = `<div id="feedback" hx-swap-oob="true">Found no videos</div>`
        }
      }

      return result
    },
  })

  htmx.ajax("GET", getUrlObject(location.pathname).html, "#main")
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
    alpineInit(token)
    Alpine.start()
    initHtmx(token)
    handleSidebarScroll()
  } else {
    const link = document.querySelector<HTMLLinkElement>(".js-twitch-login")!
    link.parentElement?.classList.remove("hidden")
    link.href = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${window.location.origin + window.location.pathname}&response_type=token&scope=`
  }
}

init()

