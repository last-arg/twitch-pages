import { Games, SearchGames } from "./games";
import { LiveStreams, LiveStreamsStore, Streams, StreamsStore, UserImages } from "./streams";
import { Sidebar } from "./sidebar";

/** @type {Games} */
export var games;
// NOTE: StreamsStore also contains LiveStreamsStore
/** @type {LiveStreams} */
export var live;
/** @type {Streams} */
export var streams;

/** @type {Sidebar} */
export var sidebar;

export function init_common() {
    const live_store = new LiveStreamsStore();
    const streams_store = new StreamsStore(live_store);
    const user_images = new UserImages(streams_store);

    games = new Games();
    live = new LiveStreams(streams_store);
    streams = new Streams(streams_store, live, user_images);

    new SearchGames(games);
    sidebar = new Sidebar();

    games.addEventListener("games:saved", function() {
        games.render();
        // render page /category/<name> game stars
        // render page / (root) game stars
        // render search sidebar game stars
        for (const button_follow of document.querySelectorAll(".button-follow[data-for=game]")) {
            const game_id = /** @type {string | undefined} */ (button_follow.dataset.itemId);
            if (game_id === undefined) {
                console.warn(`Could not find 'data-item-id' attribute in`, button_follow);
                continue;
            }
            const is_followed_raw = /** @type {string | undefined} */ (button_follow.dataset.isFollowed);
            if (is_followed_raw === undefined) {
                console.warn(`Could not find 'data-is-followed' attribute in`, button_follow);
                continue;
            }
            const is_followed = is_followed_raw === "true";
            const has_game = games.items.some((val) => val.id === game_id);
            if (is_followed !== has_game) {
                button_follow.dataset.isFollowed = has_game.toString();
            }
        }
    });

    streams_store.addEventListener("streams_store:save", render_streams);
    live_store.addEventListener("live_streams:save", render_streams);

    function render_streams() {
        console.log("render")
        streams.render();

        // render /<user>/videos user follow stars
        // render page /category/<name> user follow stars
        for (const button_follow of document.querySelectorAll(".button-follow[data-for=stream]")) {
            const user_id = /** @type {string | undefined} */ (button_follow.dataset.itemId);
            if (user_id === undefined) {
                console.warn(`Could not find 'data-item-id' attribute in`, button_follow);
                continue;
            }
            const is_followed_raw = /** @type {string | undefined} */ (button_follow.dataset.isFollowed);
            if (is_followed_raw === undefined) {
                console.warn(`Could not find 'data-is-followed' attribute in`, button_follow);
                continue;
            }
            const is_followed = is_followed_raw === "true";
            const has_stream = streams_store.items.some((val) => val.user_id === user_id);
            if (is_followed !== has_stream) {
                button_follow.dataset.isFollowed = has_stream.toString();
            }
        }
    }
}
