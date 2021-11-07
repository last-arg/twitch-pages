# Twitch alternative page
Use twitch API to display simple alternatives to some twitch pages.
Pages:
* Top games
* Category/Game
* User videos
* Settings (non-twitch api page)


## TODO
* CSS .filter-wrapper remove hardcoded number from 'top' attribute
* filter search: titles with '"' dont work, have to escape them or remove them
  * might have to escape CSS selector search value also
  * generated selector seems to only work with id (not class)
* User page: add video type tag(text) to items? hover?

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
