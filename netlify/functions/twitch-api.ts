import { Handler } from "@netlify/functions";
import fetch from "node-fetch";
import { TWITCH_CLIENT_ID, TWITCH_MAX_QUERY_COUNT } from "../../src/common"
import { mainContent } from "../../src/config.prod"

const CAT_IMG_WIDTH = 104
const CAT_IMG_HEIGHT = 144
const VIDEO_IMG_WIDTH = 440
const VIDEO_IMG_HEIGHT = 248

const API_URL = "https://api.twitch.tv"
const { TWITCH_CLIENT_SECRET } = process.env


const twitch_headers = {
  "Host": "api.twitch.tv",
  "Client-id": TWITCH_CLIENT_ID,
  "Accept": "application/vnd.twitchtv.v5+json",
};

// Category and Top Games have same structure
interface Game {
  name: string,
  id: string,
}

interface Video {
  user_id: string,
  user_login: string,
  user_name: string,
  title: string,
  thumbnail_url: string,
  viewer_count: number,
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

const topGamesHtml = (games: Game[]): string => {
  let result = ""
  for (const game of games) {
    const game_url = mainContent['category'].url.replace(":name", game.name)
    result += `
      <li class="fade-in flex">
        <div class="flex w-full border-2 border-white">
          <a href="${game_url}"
            hx-push-url="${game_url}"
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
                <use x-show="!followed" href="/assets/icons.svg#star-empty"></use>
                <use x-show="followed" href="/assets/icons.svg#star-full"></use>
              </svg>
            </button>
            <a class="hover:text-violet-700"
              href="https://www.twitch.tv/directory/games/${game.name}" aria-label="Game's Twitch page"
            >
              <svg class="fill-current w-5 h-5">
                <use href="/assets/icons.svg#external-link"></use>
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
      <a class="flex items-center text-lg group block pr-3
          hover:underline hover:text-violet-700
          focus:underline focus:text-violet-700
        "
        href="https://www.twitch.tv/directory/game/${game.name}"
      >
        <img class="w-10" src="${getImageSrc(game.name, CAT_IMG_WIDTH, CAT_IMG_HEIGHT)}" width="${CAT_IMG_WIDTH}" height="${CAT_IMG_HEIGHT}">
        <p class="line-clamp-2 pl-3">${game.name}</p>
        <svg class="flex-none fill-current w-4 h-4 ml-2 text-violet-400 group-hover:text-violet-700 group-focus:text-violet-700">
          <use href="/assets/icons.svg#external-link"></use>
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
        <use x-show="!followed" href="/assets/icons.svg#star-empty"></use>
        <use x-show="followed" href="/assets/icons.svg#star-full"></use>
      </svg>
    </button>
    <input type="hidden" id="param-game_id" class="category-param" hx-swap-oob="true" name="game_id" value="${game.id}">
  `
}

const streamsHtml = (streams: Video[]) => {
  let result = ""
  for (const stream of streams) {
    const videoUrl = mainContent['user-videos'].url.replace(":user", stream.user_login)
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
                <use href="/assets/icons.svg#external-link"></use>
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
                    <use x-show="!$store.streams.hasId('${stream.user_id}')" href="/assets/icons.svg#star-empty"></use>
                    <use x-show="$store.streams.hasId('${stream.user_id}')" href="/assets/icons.svg#star-full"></use>
                  </svg>
                </button>
              </div>
              <a class="flex items-center hover:underline hover:text-violet-700"
                href="https://www.twitch.tv/${stream.user_login}/videos"
              >
                <p>Go to Twitch videos</p>
                <svg class="fill-current w-4 h-4 ml-1">
                  <use href="/assets/icons.svg#external-link"></use>
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

const jsonToHtml = (path: string, json: any): string | null => {
  let result: string | null = "";
  if (path === "/helix/games/top") {
    result = topGamesHtml(json.data)
    if (json.pagination && json.pagination.cursor) {
      result += `<input type="hidden" id="top-games-params" hx-swap-oob="true" name="after" value="${json.pagination.cursor}">`
    } else {
      result += `<div id="load-more-wrapper" hx-swap-oob="innerHTML">
        <p class="load-more-msg">No more games to load</p>
      </div>`
    }
  } else if (path === "/helix/games") {
    result = categoryTitleHtml(json.data[0])
    if (json.pagination && json.pagination.cursor) {
      result += `<input type="hidden" id="param-after" class="category-param" hx-swap-oob="true" name="after" value="${json.pagination.cursor}">`
    }
  } else if (path === "/helix/streams") {
    result = streamsHtml(json.data)
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
  if (TWITCH_CLIENT_SECRET === undefined) {
    return errorReturn(400, `Failed to get twitch client secret environment variable`)
  }
  let {path, token, ...attrs} = event.queryStringParameters
  const requestUrl = new URL(path, API_URL)
  requestUrl.search = Object.entries(attrs).map((key_val: string[]) => key_val.join("=")).join("&")

  let result_headers = {}
  let response: Response
  try {
    // console.log(requestUrl.toString())
    // console.log(headers)

    if (token === "" || token === "null" || token === "undefined") {
      console.log("INFO: Getting new token")
      const new_token = await requestTwitchToken()
      if (new_token === undefined) {
        return errorReturn(response.status || 500, "Failed to get twitch access token")
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
    if (response.status === 401) {
      const new_token = await requestTwitchToken()
      if (new_token === undefined) {
        return errorReturn(response.status || 500,
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
