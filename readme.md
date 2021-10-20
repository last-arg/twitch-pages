# Twitch alternative page
Use twitch API to display simple alternatives to some twitch pages.
Pages:
* Top games
* Category/Game
* User videos


## TODO
* Close sidebar when game/stream/search clicked
* Load more button when response.pagination.cursor === undefined. Replace button text with 'No more to load'?
* Settings page
  * Stream live check interval?
  * Clear cache: all, streams, games, ...
* Search/Filter
  * Category/Game page
  * User videos page
  * Sidebar
    * Games
    * Streams
* Accessibility
  * 'Load more button'
    * aria-live?
      * No more videos to load
      * Loaded 5 videos
      * Loaded 5 videos. 8 Archives, 2 Uploads, 1 Hightlight

### Explore/Try
* twinspark.js

## Resources

### Accessibility
* [How to handle search results](https://www.sajari.com/blog/wcag-compliance-guide)
* [a11y-101](https://a11y-101.com)

### Routing
* [Alpine routing](https://github.com/alpinejs/alpine/issues/306#issuecomment-627400322)
* Non-hash (pathname) variant should be possible also
* [Htmx routing](https://htmx.org/attributes/hx-push-url/)
* hx-push-url should probably be used with [hx-history-elt](https://htmx.org/attributes/hx-history-elt/)
* Swapping multiple elements in htmx with hx-swap-oob (response text contains the attribute)
