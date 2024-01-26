export const state = {
    /** @type {string | null} */
    path: document.location.pathname,   
    /** @param {string | null} path */
    setPath(path) {
        this.path = path;
    }
}
