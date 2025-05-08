declare module 'idiomorph' {
    var Idiomorph: {
        morph: (old_node: any, new_content: any, config?: any) => Element[];
    };
}

type StreamTwitch = {
    user_id: string,
    game_name: string,
    type: string,
}

type Game = {
    name: string,
    id: string,
    box_art_url: string,
}

type VideoType = "archive" | "upload" | "highlight";

type StreamLocal = {user_id: string, user_login: string, user_name: string}; 

type ProfileImage = {url: string, last_access: number};
type ProfileImages = Record<string, ProfileImage>;
type ProfileLocalStorage = {images: ProfileImages, last_update: number};


type Info = {
    tmpl: HTMLTemplateElement,
    target: HTMLElement,
    merge_mode: "append" | "replace",
};

type UserTwitch = {id: string, profile_image_url: string};

type Search = {name: string, id: string};
type TokenLocal = {access_token: string, expires_date: number};

type UrlResolve = {
    url: string,
    html: string,
};

type SidebarState = "closed" | "games" | "streams" | "search";
