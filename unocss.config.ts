import { defineConfig, escapeSelector } from "unocss";
import fs from 'fs';

// npx unocss "index.html" "netlify/functions/*.{js,ts}" "public/partials/*.html" "src/*.{js,ts}" -o src/styles/main.css

const resetTailwind = fs.readFileSync('node_modules/@unocss/reset/tailwind.css')
const srcStyleCss = fs.readFileSync('src/style.css')

const config = defineConfig({
  rules: [
    ['fill-current', { fill: 'currentColor' }],
    [/^stack\-?(\d*)(\w*)$/, ruleStack, {layer: "component"}],
    [/^l-grid-?(.*)$/, ruleLayoutGrid, {layer: "component"}],
    [/^sidebar\-button$/, ruleSidebarButton, {layer: "component"}],
    [/^sidebar\-wrapper$/, ruleSidebarWrapper, {layer: "component"}],
    [/^filter\-checkbox\-btn$/, ruleFilterCheckboxBtn, {layer: "component"}],
  ],
  shortcutsLayer: "component",
  shortcuts: [
    ['btn', 'py-1 px-2 rounded-sm'],
    ['btn-setting', 'bg-indigo-300 text-black hover:bg-indigo-400'],
    ['btn-twitch', 'bg-violet-600 text-truegray-100 inline-block hover:bg-violet-800'],
    ['title-setting', 'text-xl text-truegray-400'],
    ['search-wrapper', 'ml-auto mr-4 border-b-5 border-gray-900 focus-within:border-violet-700'],
    ['load-more-msg', 'border-2 py-1 border-trueGray-300 text-trueGray-500'],
  ],
  preflights: [
    { getCSS: () => resetTailwind.toString(), layer: 'reset' },
    { getCSS: () => {
      let result = srcStyleCss.toString();
      // const ru = {
      //   index: 0,
      //   rawCSS: result,
      // }
      // const r = generator.stringifyUtil(ru)
      // console.log(r)
      // const matched = generator.matchVariants("")
      // result = result.replaceAll(/@apply (.+);+/g, async (_, c) => {
      //   const [[,,css_body]] = await generator.stringifyShortcuts(matched, c.split(" "))
      //   console.log(css_body)
      //   return "testthis"
      // })
      return result;
    } , layer: 'base' },
  ],
  layers: {
    reset: 0,
    base: 1,
    component: 2,
    default: 3,
  },
});


async function ruleSidebarButton([], { rawSelector, generator }) {
  let result = ""
  const matched = generator.matchVariants("")
  const default_rules = [
    "block", "h-full", "mr-4", "px-3", "pt-1.5", "pb-0.5", "border-b-5",
    "text-gray-200", "bg-gray-900", "border-gray-900",
    "hover:text-gray-50", "hover:text-gray-50", "hover:border-gray-500",
    "focus:text-gray-50", "focus:text-gray-50", "focus:border-gray-500",
  ]

  const selectors = await generator.stringifyShortcuts(matched, default_rules)
  const escapedSelector = escapeSelector(rawSelector)
  for (const [,selector, css_body] of selectors) {
    result += selector.replace(".", "." + escapedSelector)
    result += `{${css_body}}\n`
  }

  const [[,,css_body]] = await generator.stringifyShortcuts(matched, ["border-violet-700"])
  result += `.${escapedSelector}[aria-expanded="true"] {${css_body}}`
  return result
}

async function ruleSidebarWrapper([], { rawSelector, generator }) {
  let result = ""
  const matched = generator.matchVariants("")
  const classSelector = "." + escapeSelector(rawSelector)
  {
    const default_rules = ["h-screen", "pt-11", "pb-2", "absolute", "top-0", "left-full", "max-w-20rem", "w-full", "transform"]
    const [[,,css_body]] = await generator.stringifyShortcuts(matched, default_rules)
    result += `${classSelector}{${css_body}transition: visibility 150ms, opacity 150ms, transform 150ms;z-index:-10}\n`
  }
  {
    const [[,,css_body]] = await generator.stringifyShortcuts(matched, ["translate-x-0", "opacity-0", "invisible"])
    result += `[aria-expanded="false"] ~ ${classSelector}{${css_body}}\n`
  }
  {
    const [[,,css_body]] = await generator.stringifyShortcuts(matched, ["opacity-100", "visible"])
    result += `[aria-expanded="true"] ~ ${classSelector}{${css_body};--un-translate-x:-100%;}\n`
  }
  return result
}

async function ruleFilterCheckboxBtn([], { rawSelector, generator }) {
  let result = ""
  const matched = generator.matchVariants("")
  const classSelector = "." + escapeSelector(rawSelector)
  {
    const default_rules = ["p-1", "border-r-2", "border-truegray-50"]
    const [[,,css_body]] = await generator.stringifyShortcuts(matched, default_rules)
    result += `${classSelector}{${css_body}}\n`
  }
  {
    const [[,,css_body]] = await generator.stringifyShortcuts(matched, ["bg-lime-300"])
    result += `${classSelector}.archive.checked > span{${css_body}}\n`
  }
  {
    const [[,,css_body]] = await generator.stringifyShortcuts(matched, ["bg-sky-300"])
    result += `${classSelector}.upload.checked > span{${css_body}}\n`
  }
  {
    const [[,,css_body]] = await generator.stringifyShortcuts(matched, ["bg-amber-300"])
    result += `${classSelector}.highlight.checked > span{${css_body}}\n`
  }
  
  return result
}

function ruleStack([selector, nr, unit]) {
  const classSelector = "." + escapeSelector(selector)
  const css_attr = "--space"

  if (nr === '' && unit === '') {
    return `
${classSelector} { display: flex; flex-direction: column; justify-content: flex-start; }
${classSelector} > template + *,
${classSelector} > * {
  margin-top: 0;
  margin-bottom: 0;
}

${classSelector} > * + * { margin-top: var(${css_attr}, 1.5rem); }
    `
  }

  if (unit !== '') return `${classSelector} { ${css_attr}: ${nr}${unit}; }`
  if (nr !== '') return `${classSelector} { ${css_attr}: ${nr / 4}rem; }`

  return `/* Failed to generate stack rule from ${selector} */`
}

async function ruleLayoutGrid([selector, min_width], {generator}) {
  const classSelector = "." + escapeSelector(selector)
  if (min_width === '') {
    return `
${classSelector} {
  display: grid;
  grid-gap: 1rem;
  grid-template-columns: 100%;
}
@supports (width: min(var(--grid-min), 100%)) {
  ${classSelector} { grid-template-columns: repeat(auto-fill, minmax(min(var(--grid-min), 100%), 1fr)); }
}
    `
  }

  const [,,attrs] = await generator.parseUtil(min_width)
  const value = attrs[0][1]
  if (value) return `${classSelector} { --grid-min: ${value} }`

  return `/* Failed to generate l-grid rule from ${selector} */`
}

export default config
