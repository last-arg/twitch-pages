export interface UrlResolve {
  url: string,
  html: string,
}
export const urlRoot = "/twitch-pages"
export const mainContent: Record<string, UrlResolve> = {
  "top-games": {
    url: urlRoot,
    html: "/public/partials/top-games.html",
  },
  "category": {
    url: urlRoot + "/directory/game/:name",
    html: "/public/partials/category.html",
  },
  "user-videos": {
    url: urlRoot + "/:user/videos",
    html: "/public/partials/user-videos.html",
  },
  "not-found": {
    url: urlRoot + "/not-found",
    html: "/public/partials/not-found.html",
  }
}
