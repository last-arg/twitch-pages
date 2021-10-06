export interface UrlResolve {
  url: string,
  html: string,
}
export const urlRoot = "/twitch-pages"
export const mainContent: Record<string, UrlResolve> = {
  "top-games": {
    url: urlRoot,
    html: "/partials/top-games.html",
  },
  "category": {
    url: urlRoot + "/directory/game/:name",
    html: "/partials/category.html",
  },
  "user-videos": {
    url: urlRoot + "/:user/videos",
    html: "/partials/user-videos.html",
  },
  "not-found": {
    url: urlRoot + "/not-found",
    html: "/partials/not-found.html",
  }
}
