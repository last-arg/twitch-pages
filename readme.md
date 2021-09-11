# Title


## TODO
* Make own script of htmx without global factory. Problem is as soon htmx is loaded it is also started.
* html over the wire:
  * htmx
  * twinspark.js
  * implement in alpine
* Change page title when changing page url
* Scroll shadows
  * [Example 3](https://codepen.io/chris22smith/pen/OJMrWgb)
* 404 page + title
* Accessibility
  * Sidebar
    * game/stream clicked close sidebar, load new url content, move focus to main, close sidebar?
      * aria live role
  * 'Load more button'
    * Move focus to first new result.
    * What if there is no result to move focus to? Move to last item?
    * No more page:
      * hide button? disable button?
      * Where to move focus? last item? Or keep focus on button if button is disabled not hidden
    * Native disable option isn't good for accessibility.


## Resources

### Accessibility
* [How to handle search results](https://www.sajari.com/blog/wcag-compliance-guide)

### Routing
* [Alpine routing](https://github.com/alpinejs/alpine/issues/306#issuecomment-627400322)
* Non-hash (pathname) variant should be possible also
* [Htmx routing](https://htmx.org/attributes/hx-push-url/)
* hx-push-url should probably be used with [hx-history-elt](https://htmx.org/attributes/hx-history-elt/)
* Swapping multiple elements in htmx with hx-swap-oob (response text contains the attribute)

