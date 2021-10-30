export interface UrlResolve {
  url: string,
  html: string,
}

export const urlRoot = "/"
export const mainContent: Record<string, UrlResolve> = {
  "top-games": {
    url: urlRoot,
    html: urlRoot + "partials/top-games.html",
  },
  "category": {
    url: urlRoot + "directory/game/:name",
    html: urlRoot + "partials/category.html",
  },
  "user-videos": {
    url: urlRoot + ":user/videos",
    html: urlRoot + "partials/user-videos.html",
  },
  "settings": {
    url: urlRoot + "settings",
    html: urlRoot + "partials/settings.html",
  },
  "not-found": {
    url: urlRoot + "not-found",
    html: urlRoot + "partials/not-found.html",
  }
}
