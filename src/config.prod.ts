export interface UrlResolve {
  url: string,
  html: string,
}

export const mainContent: Record<string, UrlResolve> = {
  "top-games": {
    url: "/",
    html: "/public/partials/top-games.html",
  },
  "category": {
    url: "/directory/game/:name",
    html: "/public/partials/category.html",
  },
  "user-videos": {
    url: "/:user/videos",
    html: "/public/partials/user-videos.html",
  },
  "settings": {
    url: "/settings",
    html: "/public/partials/settings.html",
  },
  "not-found": {
    url: "/not-found",
    html: "/public/partials/not-found.html",
  }
}
