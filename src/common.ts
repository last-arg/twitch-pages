export const TWITCH_MAX_QUERY_COUNT = 100
export const TWITCH_CLIENT_ID = "7v5r973dmjp0nd1g43b8hcocj2airz";
export const SEARCH_COUNT = 10
export const STREAMS_COUNT = 5
export const USER_VIDEOS_COUNT = 10
export const TOP_GAMES_COUNT = 5

export type VideoType = "archive" | "upload" | "highlight"

// Category and Top Games have same structure
export interface Game {
  name: string,
  id: string,
  box_art_url: string,
}

export const twitchCatImageSrc = (url_template: string, width: number, height: number): string => {
  return url_template.replace("{width}", width.toString()).replace("{height}", height.toString());
}

