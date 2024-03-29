import { Handler } from "@netlify/functions";
import { TWITCH_CLIENT_ID } from "../../src/js/config.prod"

const { TWITCH_CLIENT_SECRET } = process.env

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
  const data = await oauth_resp.text(); 
  return data;
}

const handler: Handler = async (event) => {
  // console.log("EVENT:", event)
  if (TWITCH_CLIENT_SECRET === undefined) {
    return errorReturn(400, `Failed to get twitch client secret environment variable`)
  }

  const new_token = await requestTwitchToken()

  if (new_token === undefined) {
    return errorReturn(500, "Failed to get new token from twitch");
  }

  return { statusCode: 200, body: new_token };
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
