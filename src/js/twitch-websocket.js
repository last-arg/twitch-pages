/**
  Explored this. Might try to use it again in the future. Reason I stopped
  trying to implement this is because websockets require user access token
  (I have application access token). To get user access token, the user 
  has to login to twitch with oauth.
*/

/*
TODO: websocket explore
  - events: stream.{online, offline}, channel.update
  - channel.updated would be used only when stream online.
*/

/**
  @param {"stream.online" | "stream.offline" | "channel.update"} type
  @param {string} user_id
  @param {string} session_id
*/
function create_sub(type, user_id, session_id) {
    return {
        type: type,
        version: "1",
        condition: { broadcaster_user_id: user_id },
        transport: { method: "websocket", session_id: session_id }
    };
}

// TODO: Make class TwitchWebSocket?
class TwitchWebSocket {
    static base_subscription = `https://api.twitch.tv/helix/eventsub/subscriptions`;
    // static base_subscription = `http://localhost:8080/eventsub/subscriptions`;
    /** @type {Record<string, string[]>} */
    subs = {};

    /** @param {Record<string, string>} headers */
    constructor(headers) {
        this.headers = headers
        this.subs = {
            "151368796": [],
        }
    }

    connect() {
        /** @type {null | string} */
        let session_id = null;
        const headers = this.headers;
        const base = "wss://eventsub.wss.twitch.tv";
        // const base = "ws://127.0.0.1:8080";
        const w = new WebSocket(`${base}/ws?keepalive_timeout_seconds=60`);
        w.addEventListener("open", () => {
            console.log("Connected to twitch websocket");
        });

        w.addEventListener("message", async (event) => {
            const resp = JSON.parse(event.data);
            // console.log("Message from server ", event.data);
            const meta = resp.metadata;
            const message_type = meta.message_type;

            if (message_type === "session_welcome") {
                session_id = resp.payload.session.id;
                if (session_id === null) {
                    console.warn("Failed to get session id for twitch websocket")
                    return;
                }
                for (const user_id in this.subs) {
                    const body = JSON.stringify(create_sub("stream.online", user_id, session_id));
                    this.sub_add(body)
                        .then((json) => {
                            console.log(json);
                            for (const sub of json.data) {
                                if (sub.condition.broadcaster_user_id) {
                                    this.subs[sub.condition.broadcaster_user_id] = [sub.id];
                                }
                            }
                        })
                    get_subscribed_events(headers);
                }
            } else if (message_type == "session_keepalive") {
                console.log("keepalive");
                return;
            } else if (message_type === "notification") {
                if (session_id === null) {
                    console.warn("Have no session id for twitch websocket")
                    return;
                }

                const sub = resp.payload.subscription;
                const payload_event = resp.payload.event;

                console.log(resp);
                if (sub.type == "stream.online" && payload_event.type === "live") {
                    console.group("stream.online")
                    console.log(this.subs)
                    console.log(payload_event.broadcaster_user_id)
                    const user_id = payload_event.broadcaster_user_id;
                    this.subs_delete(this.subs[user_id]);
                    this.subs[user_id] = [];

                    const body_add = JSON.stringify(create_sub("stream.offline", user_id, session_id));
                    const async_add = this.sub_add(body_add)
                    const body_update = JSON.stringify(create_sub("channel.update", user_id, session_id));
                    const async_update = this.sub_add(body_update)

                    const json_add = await async_add;
                    const first_add = json_add.data[0];
                    if (first_add === undefined || first_add.condition.broadcaster_user_id !== user_id) {
                        return;
                    }
                    this.subs[user_id].push(first_add.id);

                    const json_update = await async_update;
                    const first_update = json_update.data[0];
                    if (first_update === undefined || first_update.condition.broadcaster_user_id !== user_id) {
                        return;
                    }
                    this.subs[user_id].push(first_update.id);
                    console.groupEnd();
                } else if (sub.type == "stream.offline") {
                    console.group("stream.offline")
                    console.log("sub events", await get_subscribed_events(headers));
                    const user_id = payload_event.broadcaster_user_id;
                    const user_subs = this.subs[user_id];
                    console.log(user_subs);
                    this.subs_delete(user_subs);

                    const body = JSON.stringify(create_sub("stream.online", user_id, session_id));
                    this.sub_add(body)
                        .then((json) => {
                            console.log(json);
                            const first = json.data[0];
                            if (first === undefined || first.condition.broadcaster_user_id !== user_id) {
                                return;
                            }
                            this.subs[user_id] = [first.id];
                        })
                    console.groupEnd();
                } else if (sub.type == "channel.update") {
                    console.group("channel.update")
                    // TODO: update user category
                    console.groupEnd();
                }
            }
        });

        w.addEventListener("close", (_event) => {
            console.log("Websocket was closed");
            session_id = null;
            this.subs = {};
        });

        w.addEventListener("error", (_event) => {
            console.log("Websocket error");
            session_id = null;
            this.subs = {};
        });
    }

    /** @param {string} body */
    sub_add(body) {
        console.log(this.headers)
        return fetch(TwitchWebSocket.base_subscription, {
            headers: this.headers,
            method: "POST",
            body: body,
        })
            .then((resp) => resp.json())
    }

    /** @param {string[]} ids */
    subs_delete(ids) {
        for (const id of ids) {
            fetch(`${TwitchWebSocket.base_subscription}?id=` + id, {
                headers: this.headers,
                method: "DELETE",
            })
        }
    }
};

function get_subscribed_events(headers) {
    return fetch(`${TwitchWebSocket.base_subscription}?status=enabled`, { headers: headers })
        .then((resp) => resp.json())
}


