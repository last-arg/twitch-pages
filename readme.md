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

## Resources

### Accessibility
* [How to handle search results](https://www.sajari.com/blog/wcag-compliance-guide)
* [a11y-101](https://a11y-101.com)

## NOTE: Nixos 
Have to set interpreter for lightningcss executable
```
cd node_modules/lightningcss-cli/
patchelf --set-interpreter "$(cat $NIX_CC/nix-support/dynamic-linker)" ./lightningcss
```
