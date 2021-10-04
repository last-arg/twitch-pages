interface UrlResolve {
  url: string,
  html: string,
}
export const mainContent: Record<string, UrlResolve> = {
  "top-games": {
    url: "/",
    html: "/partials/top-games.html",
  },
  "category": {
    url: "/directory/game/:name",
    html: "/partials/category.html",
  },
  "user-videos": {
    url: "/:user/videos",
    html: "/partials/user-videos.html",
  },
  "not-found": {
    url: "/not-found",
    html: "/partials/not-found.html",
  }
}
