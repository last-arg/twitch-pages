module.exports = {
	globDirectory: '_site/',
	globPatterns: [
		'**/*.{svg,html,css,js}'
	],
	swDest: '_site/sw.js',
	skipWaiting: true,
	ignoreURLParametersMatching: [
		/^utm_/,
		/^fbclid$/
	]
};