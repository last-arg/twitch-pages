import { act } from "@artalar/act";
import { renderStreams, strCompareField } from "./common";


export type Stream = {user_id: string, user_login: string, user_name: string};

const key_streams = "streams"
const key_streams_live = `${key_streams}.live`
const key_live_check = `${key_streams_live}.last_check`
const live_check_ms = 600000 // 10 minutes

export const streams_list = document.querySelector(".js-streams-list")!;
export const stream_tmpl = (streams_list?.nextElementSibling! as HTMLTemplateElement).content.firstElementChild!;

export const streams: Stream[] = JSON.parse(localStorage.getItem(key_streams) ?? "[]");
const add_streams = act<Stream[]>([]);
const remove_streams = act<string[]>([]);

const streams_update = act(() => {
    console.log("update streams")
    const adds = add_streams();
    const removes = remove_streams();
    if (adds.length === 0 || removes.length === 0) {
        return;
    }
    for (const add of adds as Stream[]) {
        if (!streams.some(stream => stream.user_id === add.user_id)) {
            streams.push(add);
        }
    }

    for (const id of removes) {
        const index = streams.findIndex((stream) => stream.user_id === id);
        if (index === -1) {
            continue;
        }
        streams.splice(index, 1)
    }

    streams.sort(strCompareField("user_login"));
    // localStorage.setItem(key_streams, JSON.stringify(streams))

    if (adds.length > 0) {
        renderStreams(stream_tmpl, streams_list, streams);
        htmx.process(streams_list as HTMLElement);
    }

    // TODO: remove stream follows

    add_streams([]);
    remove_streams([]);
})

streams_update();
streams_update();
streams_update();
