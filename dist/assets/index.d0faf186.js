import{m as u}from"./vendor.e906ad84.js";const E=function(){const s=document.createElement("link").relList;if(s&&s.supports&&s.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))r(t);new MutationObserver(t=>{for(const o of t)if(o.type==="childList")for(const n of o.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&r(n)}).observe(document,{childList:!0,subtree:!0});function e(t){const o={};return t.integrity&&(o.integrity=t.integrity),t.referrerpolicy&&(o.referrerPolicy=t.referrerpolicy),t.crossorigin==="use-credentials"?o.credentials="include":t.crossorigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function r(t){if(t.ep)return;t.ep=!0;const o=e(t);fetch(t.href,o)}};E();const x=100,U="7v5r973dmjp0nd1g43b8hcocj2airz",N=10,m="/twitch-pages",b={"top-games":{url:m,html:m+"/partials/top-games.html"},category:{url:m+"/directory/game/:name",html:m+"/partials/category.html"},"user-videos":{url:m+"/:user/videos",html:m+"/partials/user-videos.html"},"not-found":{url:m+"/not-found",html:m+"/partials/not-found.html"}};const G=l=>{if(l===m)return b["top-games"];let s="not-found";const e=l.split("/").filter(r=>r.length>0);for(const r in b){const o=b[r].url.split("/").filter(c=>c.length>0);if(o.length!==e.length||o.length===0)continue;let n=!0;for(let c=0;c<o.length;c+=1){const g=o[c];if(g[0]!==":"&&g!==e[c]){n=!1;break}}if(n){s=r;break}}return b[s]};function j(l){const s={Host:"api.twitch.tv",Authorization:`Bearer ${l}`,"Client-id":U,Accept:"application/vnd.twitchtv.v5+json"},e=async r=>{if(r.length===0)return[];const t=`https://api.twitch.tv/helix/users?id=${r.join("&id=")}`;return(await(await fetch(t,{method:"GET",headers:s})).json()).data};document.addEventListener("alpine:initializing",()=>{const r=document.querySelector("#search-feedback");u.data("sidebar",()=>({state:"closed",loading:!1,searchValue:"",searchResults:[],init(){let t=0,o=document.activeElement;u.effect(()=>{document.activeElement?.tagName==="BUTTON"&&(this.state==="closed"?o.focus():o=document.activeElement)}),u.effect(()=>{clearTimeout(t);const n=this.searchValue.trim();n.length>0&&(this.loading=!0,t=setTimeout(async()=>{r.textContent="Searching games",this.searchResults=await this.fetchSearch(n),this.loading=!1,this.searchResults.length===1?r.textContent="Found one game":this.searchResults.length>1?r.textContent=`Found ${this.searchResults.length} games`:r.textContent="Found no games"},400))})},async fetchSearch(t){const o=t.trim();if(o.length===0)return[];const n=`https://api.twitch.tv/helix/search/categories?first=${N}&query=${o}`;return(await(await fetch(n,{method:"GET",headers:s})).json()).data??[]},toggleSidebar(t){if(this.state===t){this.state="closed";return}this.state=t},getImageSrc(t,o,n){return L(t,o,n)},sidebarToSvgIconId(t){switch(t){case"games":return"game-controller";case"streams":return"people";case"search":return"looking-class"}return""}}))}),document.addEventListener("alpine:init",function(){const r={data:JSON.parse(localStorage.getItem("games")??"[]"),ids:[],init(){u.effect(()=>{this.ids=this.data.map(({id:a})=>a),localStorage.setItem("games",JSON.stringify(this.data))})},hasId(a){return this.ids.includes(a)},toggle(a,i){return this.hasId(a)?(this.remove(a),!1):(this.add(a,i),!0)},add(a,i){let d=0;for(const{name:h}of this.data){if(i<h)break;d+=1}this.data.splice(d,0,{id:a,name:i})},remove(a){const i=this.ids.indexOf(a);i!==-1&&this.data.splice(i,1)}},t=async a=>{if(a.length===0)return[];const i=`https://api.twitch.tv/helix/streams?user_id=${a.join("&user_id=")}&first=${x}`;return(await(await fetch(i,{method:"GET",headers:s})).json()).data},o="streams",n=`${o}.live`,c=`${n}.last_check`,g=3e5,p={data:JSON.parse(localStorage.getItem(o)??"[]"),ids:[],live:JSON.parse(localStorage.getItem("streams.live")??"{}"),liveLastCheck:parseInt(JSON.parse(localStorage.getItem(c)??Date.now().toString()),10),init(){u.effect(()=>{this.ids=this.data.map(({user_id:i})=>i),localStorage.setItem(o,JSON.stringify(this.data))}),u.effect(()=>{localStorage.setItem(n,JSON.stringify(this.live))}),u.effect(()=>{localStorage.setItem(c,JSON.stringify(this.liveLastCheck))});const a=()=>{this.updateUserLiveness(this.ids),setTimeout(a,g)};a()},hasId(a){return this.ids.includes(a)},toggle(a,i,d){return this.hasId(a)?(this.remove(a),!1):(this.add(a,i,d),this.addLiveUser(a),!0)},add(a,i,d){let h=0;for(const{user_login:v}of this.data){if(i<v)break;h+=1}this.data.splice(h,0,{user_id:a,user_login:i,user_name:d})},remove(a){const i=this.ids.indexOf(a);i!==-1&&this.data.splice(i,1)},isLive(a){return this.live[a]!==void 0},async addLiveUser(a){if(this.live[a]===void 0){const i=(await t([a]))[0];i&&(this.live[i.user_id]=i.game_name)}},async updateUserLiveness(a){if(a.length===0)return;const i=Date.now(),d=Math.ceil(a.length/x);let h={};for(let v=0;v<d;v+=1){const w=v*x,k=w+x,y=await t(a.slice(w,k));for(const{user_id:C,game_name:T}of y)h[C]=T}this.live=h,this.liveLastCheck=i}},f={data:JSON.parse(localStorage.getItem("profile_images")??"{}"),lastUpdate:parseInt(JSON.parse(localStorage.getItem("profile_images_last_update")??Date.now().toString()),10),init(){const a=Object.keys(this.data),i=p.data.map(({user_id:d})=>d).filter(d=>!a.includes(d));i.length>0&&this.fetchProfileImages(i),u.effect(()=>{localStorage.setItem("profile_images",JSON.stringify(this.data))}),u.effect(()=>{localStorage.setItem("profile_images_last_update",JSON.stringify(this.lastUpdate))}),window.addEventListener("unload",()=>this.clean())},hasId(a){return this.data[a]!==void 0},imgUrl(a){const i=this.data[a];return i?(i.last_access=Date.now(),i.url):""},setImage(a,i){this.data[a]={url:i,last_access:Date.now()}},async fetchProfileImages(a){if(a.length===0)return;const i=Date.now(),d=Math.ceil(a.length/x);for(let h=0;h<d;h+=1){const v=h*x,w=v+x,k=await e(a.slice(v,w));let y={};for(let{id:C,profile_image_url:T}of k)y[C]={url:T,last_access:i};this.data={...this.data,...y}}},clean(a=[]){const i=864e5,d=Date.now();if(d-this.lastUpdate>=i){const v=Object.keys(this.data).filter(w=>!a.includes(w));for(let w of v)d-this.data[w].last_access>i&&delete this.data[w]}this.lastUpdate=d}};u.store("global",{urlRoot:m}),u.store("games",r),u.store("streams",p),u.store("profile_images",f)})}const A=()=>{const l=document.querySelectorAll(".scrollbox");for(const s of l){const e=s.closest(".scroll-container"),r=s.querySelector("ul");let t=!1;const o=n=>{if(!t){const c=n.target;window.requestAnimationFrame(function(){c.scrollTop>0?e.classList.add("has-top-shadow"):e.classList.remove("has-top-shadow"),c.scrollTop+c.offsetHeight<r.offsetHeight?e.classList.add("has-bottom-shadow"):e.classList.remove("has-bottom-shadow"),t=!1}),t=!0}};s.addEventListener("scroll",o)}},L=(l,s,e)=>`https://static-cdn.jtvnw.net/ttv-boxart/${l}-${s}x${e}.jpg`;function O(l,s,e){return L(l,s,e)}function D(l,s,e){return l.replace("{width}",s.toString()).replace("{height}",e.toString())}const $=104,_=144,S=440,I=248;window.gameClicked=null;window.userClicked=null;const R=l=>{let s="";for(const e of l)s+=`
      <li class="fade-in flex">
        <div class="flex w-full border-2 border-white">
          <a href="/directory/game/${e.name}"
            hx-push-url="/directory/game/${e.name}"
            hx-get="/partials/category.html?name=Game_name" hx-target="#main"
            class="flex flex-grow items-center bg-white hover:text-violet-700 hover:underline"
            @click="window.gameClicked = '${e.name}'"
          >
            <img class="w-16" src="${O(e.name,$,_)}" alt="" width="${$}" height="${_}">
            <p class="ml-2 text-lg">${e.name}</p>
          </a>
          <div class="bg-trueGray-100 text-trueGray-400 flex flex-col justify-between p-2">
            <button x-data="{followed: false}"
              class="hover:text-violet-700"
              x-effect="followed = $store.games.hasId('${e.id}')"
              x-on:click="$store.games.toggle('${e.id}', '${e.name}')"
              :aria-label="followed ? 'UnFollow' : 'Follow'"
            >
              <svg class="fill-current w-5 h-5">
                <use x-show="!followed" href="/src/assets/icons.svg#star-empty"></use>
                <use x-show="followed" href="/src/assets/icons.svg#star-full"></use>
              </svg>
            </button>
            <a class="hover:text-violet-700"
              href="https://www.twitch.tv/directory/games/${e.name}" aria-label="Game's Twitch page"
            >
              <svg class="fill-current w-5 h-5">
                <use href="/src/assets/icons.svg#external-link"></use>
              </svg>
            </a>
          </div>
        </div>
      </li>
    `;return s},q=l=>{const s=l.data[0];return`
    <h2>
      <a class="flex items-center text-lg group block pr-3
          hover:underline hover:text-violet-700
          focus:underline focus:text-violet-700
        "
        href="https://www.twitch.tv/directory/game/${s.name}"
      >
        <img class="w-10" src="${O(s.name,$,_)}" width="${$}" height="${_}">
        <p class="line-clamp-2 pl-3">${s.name}</p>
        <svg class="flex-none fill-current w-4 h-4 ml-2 text-violet-400 group-hover:text-violet-700 group-focus:text-violet-700">
          <use href="/src/assets/icons.svg#external-link"></use>
        </svg>
      </a>
    </h2>
    <div class="border-l-2 border-trueGray-50 h-full"></div>
    <button x-data="{followed: false}"
      class="text-gray-400 hover:text-violet-700 transition duration-100 px-3" type="button"
      x-effect="followed = $store.games.hasId('${s.id}')"
      aria-label="followed ? 'UnFollow' : 'Follow'"
      x-on:click="$store.games.toggle('${s.id}', '${s.name}')"
    >
      <svg class="fill-current w-5 h-5">
        <use x-show="!followed" href="/src/assets/icons.svg#star-empty"></use>
        <use x-show="followed" href="/src/assets/icons.svg#star-full"></use>
      </svg>
    </button>
  `},H=l=>{let s="";for(const e of l){const r=`${m}/${e.user_login}/videos`;s+=`
      <li class="fade-in">
        <div>
          <a href="https://twitch.tv/${e.user_login}" title="${e.title}"
            class="hover:text-violet-700 hover:underline"
          >
            <div class="relative">
              <img class="rounded" src="${D(e.thumbnail_url,S,I)}" alt="" width="${S}" height="${I}" />
              <p class="absolute bottom-0 left-0 bg-trueGray-800 text-trueGray-100 text-sm px-1 rounded-sm mb-1 ml-1">${e.viewer_count} viewers</p>
            </div>
            <div class="flex items-center px-1 py-1 rounded bg-white">
              <p class="truncate">${e.title}</p>
              <svg class="ml-1 flex-none fill-current w-4 h-4">
                <use href="/src/assets/icons.svg#external-link"></use>
              </svg>
            </div>
          </a>
          <div class="flex bg-white rounded px-1 py-1.5 border-t-2 border-trueGray-50">
            
            <a aria-hidden="true" href="${r}"
              hx-push-url="${r}" hx-get="/partials/user-videos.html" hx-target="#main"
              @click="window.userClicked = '${e.user_login}'"
            >
              <img class="w-14 border border-trueGray-200 hover:border-violet-700" :src="$store.profile_images.imgUrl('${e.user_id}')" alt="" width="300" height="300">
            </a>
            <div class="stack stack-m-0 ml-2">
              <div class="flex items-center mb-auto">
                <a class="hover:underline hover:text-violet-700" href="${r}"
                  hx-push-url="${r}" hx-get="/partials/user-videos.html" hx-target="#main"
                  @click="window.userClicked = '${e.user_login}'"
                >${e.user_name}</a>
                <div class="ml-4 mr-2 border-l h-6 w-0 border-trueGray-300"></div>
                <button type="button"
                  class="text-gray-400 hover:text-violet-700"
                  x-on:click="$store.streams.toggle('${e.user_id}', '${e.user_login}', '${e.user_name}')"
                >
                  <svg class="fill-current w-5 h-5">
                    <use x-show="!$store.streams.hasId('${e.user_id}')" href="/src/assets/icons.svg#star-empty"></use>
                    <use x-show="$store.streams.hasId('${e.user_id}')" href="/src/assets/icons.svg#star-full"></use>
                  </svg>
                </button>
              </div>
              <a class="flex items-center hover:underline hover:text-violet-700"
                href="https://www.twitch.tv/${e.user_login}/videos"
              >
                <p>Go to Twitch videos</p>
                <svg class="fill-current w-4 h-4 ml-1">
                  <use href="/src/assets/icons.svg#external-link"></use>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </li>
    `}return s},F=l=>{const s=l.data[0];return`
    <h2>
      <a
        class="flex items-center text-lg group block
          hover:underline hover:text-violet-700
          focus:underline focus:text-violet-700
        "
        href="https://www.twitch.tv/${s.login}/videos"
      >
        <img class="block w-10 mr-3" :src="$store.profile_images.imgUrl('${s.id}')" width="300" height="300">
        <p>${s.display_name}</p>
        <svg class="fill-current w-4 h-4 ml-2 text-violet-400 group-hover:text-violet-700 group-focus:text-violet-700">
          <use href="/src/assets/icons.svg#external-link"></use>
        </svg>
      </a>
    </h2>
    <div class="ml-6 mr-2 border-l-2 border-trueGray-50 place-self-stretch"></div>
    <button x-data="{followed: false}"
      class="text-gray-400 hover:text-violet-700 transition duration-100" type="button"
      x-transition:enter-start="opacity-0"
      x-transition:enter-end="opacity-100"
      x-effect="followed = $store.streams.hasId('${s.id}')"
      aria-label="followed ? 'UnFollow' : 'Follow'"
      x-on:click="$store.streams.toggle('${s.id}', '${s.name}', '${s.display_name}')"
    >
      <svg class="fill-current w-5 h-5">
        <use x-show="!followed" href="/src/assets/icons.svg#star-empty"></use>
        <use x-show="followed" href="/src/assets/icons.svg#star-full"></use>
      </svg>
    </button>
   `},J={archive:"bg-lime-200",upload:"bg-sky-200",highlight:"bg-amber-200"},M={archive:"Archive",upload:"Upload",highlight:"Highlight"},V={archive:"video-camera",upload:"video-upload",highlight:"video-reel"},P=l=>{const s=d=>{const h=Math.floor(d);return d-h>.5?Math.ceil(d):h},r=(Date.now()-l.getTime())/1e3/60,t=r/60,o=t/24,n=s(r),c=s(t),g=s(o),p=s(o/7),f=s(o/30),a=s(o/365);let i="1 minute ago";return a>0&&f>11?i=a===1?"1 year ago":`${a} years ago`:f>0&&p>4?i=f===1?"1 month ago":`${f} months ago`:p>0&&g>6?i=p===1?"1 week ago":`${p} weeks ago`:g>0&&c>23?i=g===1?"Yesterday":`${g} days ago`:c>0&&n>59?i=c===1?"1 hour ago":`${c} hours ago`:n>1&&(i=`${n} minutes ago`),i};function z(l,s,e){return l.replace("%{width}",s.toString()).replace("%{height}",e.toString())}const B=l=>{let s="";for(const e of l){const r=new Date(e.published_at);s+=`
      <li class="fade-in">
        <a class="block group" href="${e.url}" title="${e.title}">
          <div class="relative">
          <img class="w-full rounded-sm" src="${z(e.thumbnail_url,S,I)}" alt="" width="${S}" height="${I}" />
            <span class="opacity-90 absolute top-0 left-0 mt-1.5 ml-1.5 px-0.5 rounded-sm"
              class="${J[e.type]}"
              title="${M[e.type]}"
            >
              <svg class="fill-current w-4 h-4">
                <use href="/src/assets/icons.svg#${V[e.type]}"></use>
              </svg>
            </span>
            <div class="absolute bottom-0 left-0 flex justify-between w-full mb-1.5 text-gray-50">
              <span class="px-1 ml-1.5 text-sm bg-gray-800 rounded-sm bg-opacity-70"
              >${e.duration.slice(0,-1).replace(/(h|m)/g,":")}</span>
              <span class="px-1 mr-1.5 text-sm bg-gray-800 rounded-sm bg-opacity-70"
                title="${r.toString()}"
              >${P(r)}</span>
            </div>
          </div>
          <div class="rounded-sm flex items-center bg-white group-hover:text-violet-700 group-hover:underline px-1">
            <p class="truncate flex-grow">${e.title}</p>
            <svg class="flex-none ml-1 fill-current w-4 h-4">
              <use href="/src/assets/icons.svg#external-link"></use>
            </svg>
          </div>
        </a>
      </li>
    `}return s},X=async l=>{htmx.defineExtension("twitch-api",{onEvent:function(s,e){if(s==="htmx:configRequest"){e.detail.headers["HX-Current-URL"]=null,e.detail.headers["HX-Request"]=null,e.detail.headers["HX-Target"]=null,e.detail.headers["HX-Trigger"]=null,e.detail.headers.Authorization=`Bearer ${l}`,e.detail.headers["Client-id"]=U,e.detail.headers.Accept="application/vnd.twitchtv.v5+json";const r=new URL(e.detail.path);if(r.pathname==="/helix/games"){let t="";if(window.gameClicked)t=window.gameClicked;else{const o=location.pathname.split("/");t=decodeURIComponent(o[o.length-1])}e.detail.parameters.name=t,window.gameClicked=null}else if(r.pathname==="/helix/users"){let t="";if(window.userClicked)t=window.userClicked;else{const o=location.pathname.split("/");t=decodeURIComponent(o[o.length-2])}e.detail.parameters.login=t}}},transformResponse:function(s,e,r){const t=JSON.parse(s);let o="";const n=new URL(e.responseURL);if(n.pathname==="/helix/games")if(e.status===200)document.querySelector(".category-param[name='game_id']")?.setAttribute("value",t.data[0].id),htmx.trigger("#load-more-streams","click",{}),o=q(t);else{const c=location.pathname.split("/");o=`
            <h2 class="text-lg px-3 py-2">${decodeURIComponent(c[c.length-1])}</h2>
            <div id="feedback" hx-swap-oob="true">Game/Category not found</div>
          `}else if(n.pathname==="/helix/games/top")o=R(t.data),t.pagination&&t.pagination.cursor&&(o+=`<input type="hidden" id="top-games-params" hx-swap-oob="true" name="after" value="${t.pagination.cursor}">`);else if(n.pathname==="/helix/streams")t.data.length>0?(o=H(t.data),t.pagination!==void 0&&t.pagination.cursor&&document.querySelector(".category-param[name='after']")?.setAttribute("value",t.pagination.cursor)):o='<div id="feedback" hx-swap-oob="true">Found no live streams</div>';else if(n.pathname==="/helix/users")if(e.status===200)document.querySelector(".req-param[name='user_id']")?.setAttribute("value",t.data[0].id),htmx.trigger(".load-more-btn","click",{}),o=F(t);else{const c=location.pathname.split("/");o=`
            <h2 class="text-lg px-3 py-2">${decodeURIComponent(c[c.length-2])}</h2>
            <div id="feedback" hx-swap-oob="true">User not found</div>
          `}else if(n.pathname==="/helix/videos")if(t.data.length>0){o=B(t.data),t.pagination!==void 0&&t.pagination.cursor&&document.querySelector(".req-param[name='after']")?.setAttribute("value",t.pagination.cursor);const c=document.querySelector("#highlights-count"),g=document.querySelector("#uploads-count"),p=document.querySelector("#archives-count"),f={archives:parseInt(p.textContent,10)??0,uploads:parseInt(g.textContent,10)??0,highlights:parseInt(c.textContent,10)??0};for(const a of t.data)a.type==="archive"?f.archives+=1:a.type==="upload"?f.uploads+=1:a.type==="highlight"&&(f.highlights+=1);c.textContent=f.highlights.toString(),g.textContent=f.uploads.toString(),p.textContent=f.archives.toString()}else o='<div id="feedback" hx-swap-oob="true">Found no videos</div>';return o}}),htmx.ajax("GET",G(location.pathname).html,"#main")},W=async()=>{let l=localStorage.getItem("twitch_token");if(window.location.hash)for(const s of window.location.hash.slice(1).split("&")){const[e,r]=s.split("=");if(e==="access_token"){l=r,localStorage.setItem("twitch_token",r);break}}if(l)j(l),u.start(),X(l),A();else{const s=document.querySelector(".js-twitch-login");s.parentElement?.classList.remove("hidden"),s.href=`https://id.twitch.tv/oauth2/authorize?client_id=${U}&redirect_uri=${window.location.origin+window.location.pathname}&response_type=token&scope=`}};W();
