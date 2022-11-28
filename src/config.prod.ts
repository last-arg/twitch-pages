export interface UrlResolve {
  url: string,
  html: string,
}

const settings_base = {
  streams_count: 5,
  user_videos_count: 10,
  top_games_count: 5,
}

if (process.env.NODE_ENV === "production") {
  settings_base.streams_count = 15;
  settings_base.user_videos_count = 15;
  settings_base.top_games_count = 15;
}

export const settings = settings_base;


export const mainContent: Record<string, UrlResolve> = {
  "top-games": {
    url: "/",
    html: "/public/partials/top-games.html",
  },
  "category": {
    url: "/directory/game/:category",
    html: "/public/partials/category.html",
  },
  "user-videos": {
    url: "/:user-videos/videos",
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

export const config = {
  image: {
    category: {
      width: 104,
      height: 144,
    },
    video: {
      width: 440,
      height: 248,
    },
    user: {
      width: 300,
      height: 300,
    }
  }
}
