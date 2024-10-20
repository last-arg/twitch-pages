# Twitch alternative page
Use twitch API to display simple alternatives to some twitch pages.
Pages:
* Top games
* Category/Game
* User videos
* Settings (non-twitch api page)

## TODO
[ ] use Cache API to store some stuff?
  - user header
  - category header
[ ] Maybe use event 'visibilitychange' when making requests?
[ ] format js
[ ] use css @layer to order css (during build process)
  [ ] can add/append to layers ('@layer components {}'). Do this inside webc files.
  Because I don't like the order webc uses for CSS.
[ ] how to get css just for src/partials/*.webc
[ ] look if I can use something from here https://github.com/Set-Creative-Studio/cube-boilerplate/tree/main

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


