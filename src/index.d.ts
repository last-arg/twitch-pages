declare var htmx: any;
declare var Idiomorph: {
    morph: (old_node: any, new_content: any, config?: any) => void;
};

declare global {
    interface Window { 
        filterItems: typeof pageFilter;
        resetFilter: typeof resetFilter;
    }
}
