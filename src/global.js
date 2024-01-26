export const state = {
    /** @type {string | null} */
    path: document.location.pathname,   
    /** @param {string | null} */
    setPath(path) {
        this.path = path;
    }
}
