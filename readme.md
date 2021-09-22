# Twitch alternative page
Use twitch API to display simple twitch pages.
Pages:
* Top games
* Category/Game
* User videos


## TODO
* Make own script of htmx without global factory. Problem is as soon htmx is loaded it is also started.
* html over the wire:
  * htmx
  * twinspark.js
  * implement in alpine
* Scroll shadows
  * [Example 3](https://codepen.io/chris22smith/pen/OJMrWgb)
* Filtering on different pages?
* Accessibility
  * 'Load more button'
    * No more pages:
      * hide button? disable button? display text no more pages/videos?
      * Where to move focus? last item? Or keep focus on button if button is disabled not hidden
    * Native input disable attribute isn't good for accessibility.
    * aria-live?
      * No more videos to load
      * Loaded 5 videos
      * Loaded 5 videos. 8 Archives, 2 Uploads, 1 Hightlight


## Resources

### Accessibility
* [How to handle search results](https://www.sajari.com/blog/wcag-compliance-guide)

### Routing
* [Alpine routing](https://github.com/alpinejs/alpine/issues/306#issuecomment-627400322)
* Non-hash (pathname) variant should be possible also
* [Htmx routing](https://htmx.org/attributes/hx-push-url/)
* hx-push-url should probably be used with [hx-history-elt](https://htmx.org/attributes/hx-history-elt/)
* Swapping multiple elements in htmx with hx-swap-oob (response text contains the attribute)

