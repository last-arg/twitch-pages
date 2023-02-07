import { Handler } from "@netlify/functions";
import fetch from "node-fetch";
import { TWITCH_CLIENT_ID } from "../../src/twitch"

const { TWITCH_CLIENT_SECRET } = process.env

  console.log("start twitch-api")

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
  console.log("EVENT:", event)
  console.log("TWITCH_CLIENT_SECRET:", TWITCH_CLIENT_SECRET)
  if (TWITCH_CLIENT_SECRET === undefined) {
    return errorReturn(400, `Failed to get twitch client secret environment variable`)
  }

  if (event.queryStringParameters && event.queryStringParameters['new-token'] === '') {
    console.log("get new token");
    const new_token = await requestTwitchToken()

    if (new_token === undefined) {
      return errorReturn(500, "Failed to get new token from twitch");
    }

    return { statusCode: 200, body: new_token };
  }

  return errorReturn(404, "Unknown API request path");
};

const errorReturn = (status: number, errorMsg: string): any => {
  return {
    statusCode: status,
    body: JSON.stringify({
      error: errorMsg
    })
  }
}

export { handler };
