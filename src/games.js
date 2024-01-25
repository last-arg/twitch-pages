import { strCompareField } from './common';

/**
 * @typedef {import("./common").Game} Game
 */

export class Games extends EventTarget {
    /** @type {Game[]} */
    items = [];

    constructor() {
        super();
        this.localStorageKey = "followed_games"
        this._readStorage();
    }

    _readStorage() {
        this.items = JSON.parse(window.localStorage.getItem(this.localStorageKey) || "[]");
    }

    _save() {
        window.localStorage.setItem(this.localStorageKey, JSON.stringify(this.items));
        this.dispatchEvent(new CustomEvent('games:save'));
    }

    clear() {
        this.items = [];
        this._save();
    }

    /**
        @param {string} input_id
        @returns {boolean}
    */
    isFollowed(input_id) {
        return this.items.some(function({id}) {return id === input_id})
    }

    /**
        @param {string} game_id
    */
    unfollow(game_id) {
        const curr = this.items;
        let i = 0
        for (; i < curr.length; i++) {
            if (curr[i].id === game_id) {
                break;
            }
        }

        if (i >= curr.length) { return; }

        const remove_game = curr.splice(i, 1)[0].id
        this.dispatchEvent(new CustomEvent('games:remove', {detail: {id: remove_game}}));
        this._save();
    }

    /**
        @param {Game} game
    */
    follow(game) {
        if (this.isFollowed(game.id)) { return; }

        this.items.push(game);
        this.items.sort(strCompareField("name"))

        this.dispatchEvent(new CustomEvent('games:remove', {detail: {id: game.id}}));
        this._save();
    }
}
