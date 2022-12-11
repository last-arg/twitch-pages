const isValid = function (response) {
	if (!response) return false;
	var fetched = response.headers.get('sw-fetched-on');
	if (fetched && (parseFloat(fetched) + (1000 * 60 * 60 * 24 * 2)) > new Date().getTime()) return true;
	return false;
};

const cacheFirst = async (request) => {
  if (request.url.includes("/helix/users")) {
    caches.open("page_cache").then((page_cache) => {
      page_cache.match(request).then((response) => {
        if (response && isValid(response)) {
          return response;
        }
      });
    });
  }
  return fetch(request);
};

self.addEventListener("fetch", (event) => {
  event.respondWith(cacheFirst(event.request));
});
