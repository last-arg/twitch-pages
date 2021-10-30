import { Handler } from "@netlify/functions";
import fetch from "node-fetch";
import { TWITCH_CLIENT_ID, TWITCH_MAX_QUERY_COUNT } from "../../src/common"
import { mainContent } from "../../src/config.prod"

const CAT_IMG_WIDTH = 104
const CAT_IMG_HEIGHT = 144

const API_URL = "https://api.twitch.tv"
const { TWITCH_CLIENT_SECRET } = process.env


const twitch_headers = {
  "Host": "api.twitch.tv",
  "Client-id": TWITCH_CLIENT_ID,
  "Accept": "application/vnd.twitchtv.v5+json",
};

interface TopGame {
  name: string,
  id: string,
}

const twitchCategoryImageSrc = (name: string, width: number, height: number): string => {
  return `https://static-cdn.jtvnw.net/ttv-boxart/${name}-${width}x${height}.jpg`;
}

function getImageSrc(name: string, width: number, height: number): string {
  return twitchCategoryImageSrc(name, width, height)
}

const topGamesHtml = (games: TopGame[]) => {
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

const jsonToHtml = (path: string, json: any): string | null => {
  let result: string;
  if (path === "/helix/games/top") {
    result = topGamesHtml(json.data)
    if (json.pagination && json.pagination.cursor) {
      result += `<input type="hidden" id="top-games-params" hx-swap-oob="true" name="after" value="${json.pagination.cursor}">`
    } else {
      result += `<div id="load-more-wrapper" hx-swap-oob="innerHTML">
        <p class="load-more-msg">No more games to load</p>
      </div>`
    }
    return result
  }

  return null
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
