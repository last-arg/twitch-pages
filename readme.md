# Twitch alternative page
Use twitch API to display simple alternatives to some twitch pages.
Pages:
* Top games
* Category/Game
* User videos
* Settings (non-twitch api page)

## TODO
- use Cache API to store some stuff
  - user header
  - category header
- Waiting for page specific bundles to filesystem in webc
  - https://github.com/11ty/eleventy-plugin-webc/issues/4

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

## NOTE: Nixos 
Have to set interpreter for lightningcss executable
```
cd node_modules/lightningcss-cli/
patchelf --set-interpreter "$(cat $NIX_CC/nix-support/dynamic-linker)" ./lightningcss
```
