import { TWITCH_CLIENT_ID } from "../../src/js/config.prod"

/**
@typedef {import("@cloudflare/workers-types").EventContext} EventContext
*/

/** 
  @param {EventContext} 
  @returns {Promise<Response>}
*/
export async function onRequestGet(context) {
  const TWITCH_CLIENT_SECRET = context.env.TWITCH_CLIENT_SECRET;
  if (TWITCH_CLIENT_SECRET === undefined) {
    return new Response("Failed to get twitch client secret environment variable", {status: 400});
  }

  if (context.functionPath === "/api/new-token") {
    const new_token = await requestTwitchToken(TWITCH_CLIENT_SECRET);

    if (new_token === undefined) {
          return new Response("500 Failed to get new token from twitch", {status: 500});
    }

    return new Response(new_token, {status: 200});
  }

  return new Response("404 Page not found", {status: 404});
}

/**
  @param {string} client_secret 
  @returns {Promise<string | undefined>}
*/
async function requestTwitchToken(client_secret) {
  const oauth_url = `https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${client_secret}&grant_type=client_credentials`
  const oauth_resp = await fetch(oauth_url, {
    method: "POST",
    headers: { "Host": "id.twitch.tv" },
  })
  if (oauth_resp.status !== 200) {
    return undefined
  }
  const data = await oauth_resp.text(); 
  return data;
}
