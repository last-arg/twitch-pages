import { Handler } from "@netlify/functions";
import fetch from "node-fetch";
import { TWITCH_CLIENT_ID, VideoType, twitchCatImageSrc, Game } from "../../src/common"
import { mainContent, config } from "../../src/config.prod"

const CAT_IMG_WIDTH = config.image.category.width;
const CAT_IMG_HEIGHT = config.image.category.height;
const VIDEO_IMG_WIDTH = config.image.video.width;
const VIDEO_IMG_HEIGHT = config.image.video.height;

const API_URL = "https://api.twitch.tv"
const { TWITCH_CLIENT_SECRET } = process.env


const twitch_headers = {
  "Host": "api.twitch.tv",
  "Client-id": TWITCH_CLIENT_ID,
  "Accept": "application/vnd.twitchtv.v5+json",
};

interface Video {
  user_id: string,
  user_login: string,
  user_name: string,
  title: string,
  thumbnail_url: string,
  viewer_count: number,
}

const topGamesHtml = (games: Game[]): string => {
  let result = ""
  for (const game of games) {
    const game_url = mainContent['category'].url.replace(":name", game.name)
    result += `
      <li>
        <div>
          <a href="${game_url}"
            hx-push-url="${game_url}"
            hx-get="${mainContent['category'].html}" hx-target="#main"
           
            @click="$store.global.setClickedGame('${game.name}')"
          >
            <img src="${twitchCatImageSrc(game.box_art_url, CAT_IMG_WIDTH, CAT_IMG_HEIGHT)}" alt=""
              width="${CAT_IMG_WIDTH}" height="${CAT_IMG_HEIGHT}">
            <p>${game.name}</p>
          </a>
          <div>
            <button x-data="{followed: false}"
             
              x-effect="followed = $store.games.hasId('${game.id}')"
              @click='$store.games.toggle(${JSON.stringify(game)})'
              :aria-label="followed ? 'UnFollow' : 'Follow'"
            >
              <svg>
                <use x-show="!followed" href="/public/assets/icons.svg#star-empty"></use>
                <use x-show="followed" href="/public/assets/icons.svg#star-full"></use>
              </svg>
            </button>
            <a
              href="https://www.twitch.tv/directory/games/${game.name}" aria-label="Game's Twitch page"
            >
              <svg>
                <use href="/public/assets/icons.svg#external-link"></use>
              </svg>
            </a>
          </div>
        </div>
      </li>
    `
  }

  return result
}

const categoryTitleHtml = (game: Game): string => {
  return `
    <h2>
      <a
        href="https://www.twitch.tv/directory/game/${game.name}"
      >
        <img src="${twitchCatImageSrc(game.box_art_url, CAT_IMG_WIDTH, CAT_IMG_HEIGHT)}" width="${CAT_IMG_WIDTH}" height="${CAT_IMG_HEIGHT}">
        <p>${game.name}</p>
        <svg>
          <use href="/public/assets/icons.svg#external-link"></use>
        </svg>
      </a>
    </h2>
    <div></div>
    <button x-data="{followed: false}"
      type="button"
      x-effect="followed = $store.games.hasId('${game.id}')"
      aria-label="followed ? 'UnFollow' : 'Follow'"
      x-on:click='$store.games.toggle(${JSON.stringify(game)})'
    >
      <svg>
        <use x-show="!followed" href="/public/assets/icons.svg#star-empty"></use>
        <use x-show="followed" href="/public/assets/icons.svg#star-full"></use>
      </svg>
    </button>
    <input type="hidden" id="param-game_id" class="req-param" hx-swap-oob="true" name="game_id" value="${game.id}">
  `
}

const streamsHtml = (streams: Video[]): string => {
  let result = ""
  for (const stream of streams) {
    const videoUrl = mainContent['user-videos'].url.replace(":user-videos", stream.user_login)
    result += `
      <li data-user-id='${stream.user_id}' data-title="${encodeURIComponent(stream.title)}">
        <div>
          <a href="https://twitch.tv/${stream.user_login}" title="${stream.title}"
           
          >
            <div>
              <img src="${twitchCatImageSrc(stream.thumbnail_url, VIDEO_IMG_WIDTH, VIDEO_IMG_HEIGHT)}" alt="" width="${VIDEO_IMG_WIDTH}" height="${VIDEO_IMG_HEIGHT}" />
              <p>${stream.viewer_count} viewers</p>
            </div>
            <div>
              <p>${stream.title}</p>
              <svg>
                <use href="/public/assets/icons.svg#external-link"></use>
              </svg>
            </div>
          </a>
          <div>
            
            <a aria-hidden="true" href="${videoUrl}"
              hx-push-url="${videoUrl}" hx-get="${mainContent['user-videos'].html}" hx-target="#main"
              @click="$store.global.setClickedStream('${stream.user_login}')"
            >
              <img :src="$store.profile_images.imgUrl('${stream.user_id}')" alt="" width="${config.image.user.width}" height="${config.image.user.height}">
            </a>
            <div>
              <div>
                <a href="${videoUrl}"
                  hx-push-url="${videoUrl}" hx-get="${mainContent['user-videos'].html}" hx-target="#main"
                  @click="$store.global.setClickedStream('${stream.user_login}')"
                >${stream.user_name}</a>
                <div></div>
                <button type="button"
                 
                  x-on:click="$store.streams.toggle('${stream.user_id}', '${stream.user_login}', '${stream.user_name}')"
                >
                  <svg>
                    <use x-show="!$store.streams.hasId('${stream.user_id}')" href="/public/assets/icons.svg#star-empty"></use>
                    <use x-show="$store.streams.hasId('${stream.user_id}')" href="/public/assets/icons.svg#star-full"></use>
                  </svg>
                </button>
              </div>
              <a
                href="https://www.twitch.tv/${stream.user_login}/videos"
              >
                <p>Go to Twitch videos</p>
                <svg>
                  <use href="/public/assets/icons.svg#external-link"></use>
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

interface User {
  login: string,
  display_name: string,
  id: string,
  profile_image_url: string,
}

const userHtml = (user: User): string => {
  return `
    <div>
      <h2>
        <a
         
          href="https://www.twitch.tv/${user.login}/videos"
        >
          <img src="${user.profile_image_url}" width="${config.image.user.width}" height="${config.image.user.height}">
          <p>${user.display_name}</p>
          <svg>
            <use href="/public/assets/icons.svg#external-link"></use>
          </svg>
        </a>
      </h2>
      <div></div>
      <button x-data="{followed: false}"
        type="button"
        x-init="$store.profile_images.setImage('${user.id}', '${user.profile_image_url}')"
        x-effect="followed = $store.streams.hasId('${user.id}')"
        aria-label="followed ? 'UnFollow' : 'Follow'"
        x-on:click="$store.streams.toggle('${user.id}', '${user.login}', '${user.display_name}')"
      >
        <svg>
          <use x-show="!followed" href="/public/assets/icons.svg#star-empty"></use>
          <use x-show="followed" href="/public/assets/icons.svg#star-full"></use>
        </svg>
      </button>
    </div>
    <div :class="{hidden: game === ''}"
      x-data="{game: ''}" x-init="game = await $store.global.getLiveUserGame('${user.id}')"
    >
      <span>LIVE</span>
      <p x-text="game"></p>
    </div>
    <input type="hidden" id="param-user_id" class="req-param" hx-swap-oob="true" name="user_id" value="${user.id}">
   `
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

const twitchDurationToString = (duration: string): string => {
  const time = duration.slice(0,-1).split(/[hm]/).reverse()
  const hours = (time.length >= 3) ? `${time[2]}:` : ""
  const minutes = (time.length >= 2) ? `${time[1].padStart(2, "0")}:` : ""
  const seconds = (time.length >= 1) ? time[0].padStart(2, "0") : ""
  return `${hours}${minutes}${seconds}`
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

interface UserVideo {
  url: string,
  type: VideoType,
  duration: string,
  published_at: string,
  title: string,
  thumbnail_url: string,
}

const twitch_404_img = `https://vod-secure.twitch.tv/_404/404_processing_320x180.png`

function getVideoImageSrc(url: string, width: number, height: number): string {
  return url.replace('%{width}', width.toString()).replace('%{height}', height.toString())
}

const videosHtml = (videos: UserVideo[]): string => {
  let result = ""
  for (const video of videos) {
    const date = new Date(video.published_at)
    const img = video.thumbnail_url ? getVideoImageSrc(video.thumbnail_url, VIDEO_IMG_WIDTH, VIDEO_IMG_HEIGHT) : twitch_404_img
    // TODO?: move video.type class to data-* attribute?
    result += `
      <li class="${video.type}" data-title="${encodeURIComponent(video.title)}">
        <a href="${video.url}" title="${video.title}">
          <div>
          <img src="${img}" alt="" width="${VIDEO_IMG_WIDTH}" height="${VIDEO_IMG_HEIGHT}" />
            <span
              title="${VIDEO_TITLES[video.type]}"
            >
              <svg>
                <use href="/public/assets/icons.svg#${VIDEO_ICONS[video.type]}"></use>
              </svg>
            </span>
            <div>
              <span
              >${twitchDurationToString(video.duration)}</span>
              <span
                title="${date.toString()}"
              >${twitchDateToString(date)}</span>
            </div>
          </div>
          <div>
            <p>${video.title}</p>
            <svg>
              <use href="/public/assets/icons.svg#external-link"></use>
            </svg>
          </div>
        </a>
      </li>
    `
  }
  return result
}

const cursorHtml = (pagination: {cursor: string | undefined} | undefined, msg: string): string => {
  if (pagination && pagination.cursor) {
    return `<input type="hidden" id="param-after" class="req-param" hx-swap-oob="true" name="after" value="${pagination.cursor}">`
  }
  return `<div id="load-more-wrapper" hx-swap-oob="innerHTML">
    <p>${msg}</p>
  </div>`
}

const jsonToHtml = (path: string, json: any): string | null => {
  let result: string | null = "";
  if (path === "/helix/games/top") {
    result = topGamesHtml(json.data)
    result += cursorHtml(json.pagination, "No more games to load")
  } else if (path === "/helix/games") {
    result = categoryTitleHtml(json.data[0])
  } else if (path === "/helix/streams") {
    result = streamsHtml(json.data)
    result += cursorHtml(json.pagination, "No more streams to load")
  } else if (path === "/helix/users") {
    result = userHtml(json.data[0])
  } else if (path === "/helix/videos") {
    result = videosHtml(json.data)
    result += cursorHtml(json.pagination, "No more videos to load")
  } else {
    result = null
  }

  return result
}

const errorReturn = (status: number, errorMsg: string): any => {
  return {
    statusCode: status,
    body: JSON.stringify({
      error: errorMsg
    })
  }
}

// TODO: when token becomes invalid
// From twitch docs: 'If a token becomes invalid, your API requests return 
//   HTTP status code 401 Unauthorized. When this happens, you’ll need to get a 
//   new access token using the appropriate flow for your app.'
const requestTwitchToken = async (): Promise<string | undefined> => {
  const oauth_url = `https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`
  const oauth_resp = await fetch(oauth_url, {
    method: "POST",
    headers: {
      "Host": "id.twitch.tv"
    },
  })
  if (oauth_resp.status !== 200) {
    return undefined
  }
  const data = (await oauth_resp.json()) as Record<string, string>
  return data.access_token;
}

const handler: Handler = async (event) => {
  // return { statusCode: 200, body: "test", headers: {"this": "that"} }
  // console.log("EVENT:", event)
  if (TWITCH_CLIENT_SECRET === null) {
    return errorReturn(400, `Failed to get twitch client secret environment variable`)
  }
  // TODO: check that all query params exist
  if (event.queryStringParameters === null) {
    return errorReturn(500, "No queryStringParameters object in request handler");
  }
  if (event.queryStringParameters['request_token'] === '') {
    const new_token = await requestTwitchToken()
    return { statusCode: 200, body: new_token };
  }
  let params = event.queryStringParameters;
  const path = params.path;
  let token = params.token;
  const requestUrl = new URL(path, API_URL)
  requestUrl.search = Object.entries(attrs).map((key_val: string[]) => key_val.join("=")).join("&")

  let result_headers = {}
  let response: Response | undefined = undefined;
  try {
    // console.log(requestUrl.toString())
    // console.log(headers)
    if (token === "" || token === "null" || token === "undefined") {
      console.log("INFO: Getting new token")
      const new_token = await requestTwitchToken()
      if (new_token === undefined) {
        return errorReturn(500, "Failed to get twitch access token")
      }
      result_headers["Twitch-Access-Token"] = new_token
      twitch_headers["Authorization"] = `Bearer ${new_token}`
    } else {
      twitch_headers["Authorization"] = `Bearer ${token}`
    }

    response = await fetch(requestUrl.toString(), {
      headers: twitch_headers
    })

    // Unauthorized access try to get new token and remake the request
    if (response?.status === 401) {
      const new_token = await requestTwitchToken()
      if (new_token === undefined) {
        return errorReturn(response?.status || 500,
          "Failed to get twitch access token after unauthorized access")
      }
      result_headers["Twitch-Access-Token"] = new_token
      twitch_headers["Authorization"] = `Bearer ${new_token}`
      response = await fetch(requestUrl.toString(), {
        headers: twitch_headers
      })
    }
  } catch (err) {
    return errorReturn(err.statusCode || 500, err.message)
  }

  if (response === undefined) {
    return errorReturn(500, "Failed to get response from twitch request");
  }

  const json = await response.json()
  // console.log(json)
  if (response.status !== 200) {
    return errorReturn(response.status || 500, `${json.error}: ${json.message}`)
  }

  const html = jsonToHtml(path, json)
  if (html === null) {
    return errorReturn(400, `Unhandled twitch-api path '${path}'`)
  }
  return {
    statusCode: 200,
    headers: result_headers,
    body: html,
  };
};

export { handler };
