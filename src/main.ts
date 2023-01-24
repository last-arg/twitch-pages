import Alpine from 'alpinejs'
import "./init";
import { TWITCH_MAX_QUERY_COUNT, VideoType } from './common'


// TODO: Search: Show old values when searching for new ones?

interface UserVideo {
  url: string,
  type: VideoType,
  duration: string,
  published_at: string,
  title: string,
  thumbnail_url: string,
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

const setAriaMsg = (function() {
  const container = document.querySelector("#aria-feedback")!
  return (msg: string) => container.textContent = msg
})()

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
  document.addEventListener("alpine:init", function() {
    type StreamImage = Record<string, {url: string, last_access: number}>

    const storeProfileImages: ProfileImages = {
      data: JSON.parse(localStorage.getItem("profile_images") ?? "{}"),
      lastUpdate: parseInt(JSON.parse(localStorage.getItem("profile_images_last_update") ?? Date.now().toString()), 10),
      init() {
        // Make sure $store.streams images exist
        // const imageIds = Object.keys(this.data)
        // const fetchIds = storeStreams.data.map(({user_id}:{user_id:string}) => user_id)
        //   .filter((id: string) => !imageIds.includes(id))
        // this.fetchProfileImages(fetchIds)

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

const init = async () => {
  // Save user access_token after login (settings page)
  // if (window.location.hash) {
  //   for (const paramStr of window.location.hash.slice(1).split("&")) {
  //     const [key, token] = paramStr.split("=")
  //     if (key === "access_token") {
  //       t.setUserToken(token)
  //       location.hash = ""
  //       break
  //     }
  //   }
  // }

  // await page_cache.delete("https://api.twitch.tv/helix/users?login=kiwo");
  alpineInit()
  handleSidebarScroll()
  // if ('serviceWorker' in navigator) {
  //   window.addEventListener('load', () => {
  //       navigator.serviceWorker.register('/sw.js');
  //   });
  // }
}

init()
