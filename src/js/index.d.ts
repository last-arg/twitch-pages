declare var Idiomorph: {
    morph: (old_node: any, new_content: any, config?: any) => Element[];
};

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
