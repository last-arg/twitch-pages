# Twitch alternative page
Use twitch API to display simple alternatives to some twitch pages.
Pages:
* Top games
* Category/Game
* User videos
* Settings (non-twitch api page)

## TODO
[ ] favicon
[ ] When firefox restores page it shows previously live streams (and count).
  Althought it seems to make a request, the request returns old data. Last update
  time is set to Date.now().
  The page content is old as well. Maybe htmx history plays role in it? htmx history
  doesn't seem to play a role in this. Seems to be browser thing.
[ ] use Cache API to store some stuff?
  - user header
  - category header
[ ] Maybe use event 'visibilitychange' when making requests?

## Resources

### Accessibility
* [How to handle search results](https://www.sajari.com/blog/wcag-compliance-guide)
* [a11y-101](https://a11y-101.com)

## NOTE: Nixos 
When using have to be in nix shell (nix-shell -p hello) to have access to $NIX_CC

### Patching lightningcss
```
patchelf --set-interpreter "$(cat $NIX_CC/nix-support/dynamic-linker)" ./node_modules/lightningcss-cli/lightningcss
```

### Patching workerd (for wrangler)
```
patchelf --set-interpreter "$(cat $NIX_CC/nix-support/dynamic-linker)" ./node_modules/@cloudflare/workerd-linux-64/bin/workerd
```


