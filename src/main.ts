import "./init";

const setAriaMsg = (function() {
  const container = document.querySelector("#aria-feedback")!
  return (msg: string) => container.textContent = msg
})()

function menuItemToScrollPosition(menuitem: Element | undefined): Element | null {
  if (!menuitem) {
    menuitem = document.querySelector(".menu-item[aria-expanded=true]")!;
    if (!menuitem) return null;
  }
  let scroll_position = menuitem.nextElementSibling;
  while (scroll_position && !scroll_position.classList.contains("sidebar-position")) {
    scroll_position = scroll_position.nextElementSibling;
  }
  return scroll_position;
}

const sidebarShadows = (scrollbox: HTMLElement) => {
    const scroll_container = scrollbox.closest('.scroll-container')!;
    const ul = scroll_container.querySelector("ul")!;
    const has_top_shadow = scrollbox.scrollTop > 0;  
    const has_bottom_shadow = scrollbox.scrollTop + scrollbox.offsetHeight < ul.offsetHeight
    let shadow_type = undefined;
    if (has_top_shadow && has_bottom_shadow) {
      shadow_type = "both";
    } else if (has_top_shadow) {
      shadow_type = "top";
    } else if (has_bottom_shadow) {
      shadow_type = "bottom";
    }
    if (shadow_type) {
      scroll_container.setAttribute("data-scroll-shadow", shadow_type);
    } else {
      scroll_container.removeAttribute("data-scroll-shadow");
    }
};

const handleSidebarScroll = () => {
  const scrollContainers = document.querySelectorAll('.scroll-container') as any;
  for (const scrollContainer of scrollContainers) {
    const scrollbox = scrollContainer.querySelector('.scrollbox');
    let scrolling = false;
    scrollbox.addEventListener("scroll", (event: Event) => {
      const scrollbox = event.target as HTMLElement

      if (!scrolling) {
        window.requestAnimationFrame(function() {
          sidebarShadows(scrollbox);
          scrolling = false;
        });
        scrolling = true;
      }
    });
  }
}

const init = async () => {
  // Save user access_token after login (settings page)
  // if (window.location.hash) {
  //   for (const paramStr of window.location.hash.slice(1).split("&")) {
  //     const [key, token] = paramStr.split("=")
  //     if (key === "access_token") {
  //       t.setUserToken(token)
  //       location.hash = ""
  //       break
  //     }
  //   }
  // }

  // await page_cache.delete("https://api.twitch.tv/helix/users?login=kiwo");
  handleSidebarScroll()
  // if ('serviceWorker' in navigator) {
  //   window.addEventListener('load', () => {
  //       navigator.serviceWorker.register('/sw.js');
  //   });
  // }
}

init()
