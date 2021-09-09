# Title

## Routing
[Alpine routing](https://github.com/alpinejs/alpine/issues/306#issuecomment-627400322)
Non-hash (pathname) variant should be possible also
[Htmx routing](https://htmx.org/attributes/hx-push-url/)
hx-push-url should probably be used with [hx-history-elt](https://htmx.org/attributes/hx-history-elt/)
Swapping multiple elements in htmx with hx-swap-oob (response text contains the attribute)


## TODO
* Make own script of htmx without global factory. Problem is as soon htmx is loaded it is also started.
* Explore options for html over the wire: htmx, twinspark.js, ...
* Could implement html over the wire in alpine?
* Scroll shadows
  * [Example 3](https://codepen.io/chris22smith/pen/OJMrWgb)
* Accessibility
  * https://www.sajari.com/blog/wcag-compliance-guide
  * 'Load more button'
    * Move focus to first new result.
    * What if there is no result to move focus to? Move to last item?
    * No more page:
      * hide button? disable button?
      * Where to move focus? last item? Or keep focus on button if button is disabled
    * Native disable option isn't good for accessibility.
  * 'Sidebar close' button pressed -> move focus back to button that opened it.
