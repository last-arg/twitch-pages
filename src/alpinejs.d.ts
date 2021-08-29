type AlpineWatch = ( targetProperty: string, callback: ( ( newValue: any, oldValue?: any ) => void ) ) => void;

type AlpineMagicProperties<AlpineGlobalStore = Record<string, any>> = {
    $el?: HTMLElement;
    $refs?: { [xRefId: string]: HTMLElement };
    $watch?: AlpineWatch;
    $nextTick?: ( functionToCall: ( () => void ) ) => void;
    $store?: AlpineGlobalStore;
    $dispatch?: <T = any>( eventName: string, eventDetail?: T ) => void;
};

type AlpineMandatoryProps = {
    init?: () => void,
}

declare type AlpineComponent<Props extends BaseAlpineProps, AlpineGlobalStore = {}> = {
    (): AlpineMandatoryProps & Props & AlpineMagicProperties<AlpineGlobalStore>;
};

interface BaseAlpineProps {
    init?: ( () => void ) | ( () => Promise<void> );
}

interface AlpineRoot {
    store: any,
    start: any,
    directive: any,
    version: string,
}

declare module "alpinejs" {
    type AlpineDirectiveCallback = ( p1 : HTMLElement, p2 : any, p3: any ) => void;
    type AlpineRootCallback = ( ( alpineRoot : AlpineRoot ) => void );
    function store<R>( storeName: string, value : R ) : void;
    function store<R>( storeName: string ) : R;
    function directive( directiveName : string, cb : AlpineDirectiveCallback ): void;
    function plugin( alpineRootCallBack : AlpineRootCallback ) : void;
    function data<T>( dataName: string, dataInitializer: () => Record<string, T> ): void;
    function effect( effectCallback: () => void ): void;
    function reactive<T>( initialData: Record<string, T> ): Record<string, T>;
    function magic( magicName: string, callback: ( el: HTMLElement, alpineObj: { Alpine: AlpineRoot } ) => any ): void;
    function disableEffectScheduling(callback: () => void): void
    function initTree(el: Element,
      walker?: (el: HTMLElement, callback: (el: HTMLElement, skip: () => boolean) => void) => void): void
    function mutateDom(callback: () => void): void
    function start() : void;

    // export default Alpine = {
    //     version,
    //     store,
    //     start,
    //     directive,
    //     plugin,
    //     data,
    //     effect,
    //     reactive,
    //     magic
    // };

    interface Window {
        Alpine: AlpineRoot;
    }
}


