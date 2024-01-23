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
- service worker
  - libs:
    - https://github.com/veiss-com/sw-tools
    - https://github.com/americanexpress/one-service-worker

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


