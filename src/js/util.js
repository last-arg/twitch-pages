import { mainContent } from './config.prod';

/**
@param {string} newPath
@returns {UrlResolve}
*/
export function getUrlObject(newPath) {
    if (newPath === "/") return mainContent["top-games"]
    let contentKey = "not-found"
    const newDirs = newPath.split("/").filter((path) => path.length > 0)
    for (const key in mainContent) {
        const obj = mainContent[key]
        const dirs = obj.url.split("/").filter((path) => path.length > 0)
        if (dirs.length !== newDirs.length || dirs.length === 0) continue
        let isMatch = true
        for (let i = 0; i < dirs.length; i += 1) {
            const dir = dirs[i]
            if (dir[0] === ":") continue
            if (dir !== newDirs[i]) {
                isMatch = false
                break
            }
        }
        if (isMatch) {
            contentKey = key
            break
        }
    }
    return mainContent[contentKey]
}

/**
@param {string} url_template
@param {number} width
@param {number} height
@returns {string}
*/
export function twitchCatImageSrc(url_template, width, height) {
    return url_template.replace("{width}", width.toString()).replace("{height}", height.toString());
}

const tmp_elem = document.createElement("p");
/**
@param {string} str
@returns {string}
*/
export function encodeHtml(str) {
    tmp_elem.textContent = str;
    return tmp_elem.innerHTML;
}

/**
@param {string} cat
@param {boolean} is_twitch
@return {string}
*/
export function categoryUrl(cat, is_twitch = false) {
    let result = "";
    if (is_twitch) {
        result += "https://twitch.tv"
    }
    result += "/directory/category/" + encodeURIComponent(cat);
    return result;
}

/**
@param {string} url
@param {number} width
@param {number} height
@returns {string}
*/
export function getVideoImageSrc(url, width, height) {
    return url.replace('%{width}', width.toString()).replace('%{height}', height.toString())
}

/**
@param {string} duration
@returns {string}
*/
export function twitchDurationToString(duration) {
    const time = duration.slice(0, -1).split(/[hm]/).reverse()
    const hours = (time.length >= 3) ? `${time[2]}:` : ""
    const minutes = (time.length >= 2) ? `${time[1].padStart(2, "0")}:` : ""
    const seconds = (time.length >= 1) ? time[0].padStart(2, "0") : ""
    return `${hours}${minutes}${seconds}`
}

/**
@param {Date} d
@returns {string}
*/
export function twitchDateToString(d) {
    /**
    @param {number} nr
    @returns {number}
    */
    function round(nr) {
        const nr_floor = Math.floor(nr)
        return (nr - nr_floor) > 0.5 ? Math.ceil(nr) : nr_floor;
    }
    const seconds_f = (Date.now() - d.getTime()) / 1000
    const minutes_f = seconds_f / 60
    const hours_f = minutes_f / 60
    const days_f = hours_f / 24
    const minutes = round(minutes_f)
    const hours = round(hours_f)
    const days = round(days_f)
    const weeks = round(days_f / 7)
    const months = round(days_f / 30)
    const years = round(days_f / 365)

    let result_str = "1 minute ago"
    if (years > 0 && months > 11) {
        result_str = (years === 1) ? "1 year ago" : `${years} years ago`
    } else if (months > 0 && weeks > 4) {
        result_str = (months === 1) ? "1 month ago" : `${months} months ago`
    } else if (weeks > 0 && days > 6) {
        result_str = (weeks === 1) ? "1 week ago" : `${weeks} weeks ago`
    } else if (days > 0 && hours > 23) {
        result_str = (days === 1) ? "Yesterday" : `${days} days ago`
    } else if (hours > 0 && minutes > 59) {
        result_str = (hours === 1) ? "1 hour ago" : `${hours} hours ago`
    } else if (minutes > 1) {
        result_str = `${minutes} minutes ago`
    }

    return result_str
}

/**
@param {string} name
@returns {(a: any, b: any) => number}
*/
export function strCompareField(name) {
    return (a, b) => {
        return a[name].localeCompare(b[name], undefined, { sensitivity: "base" });
    }
}
