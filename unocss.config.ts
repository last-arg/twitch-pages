import { defineConfig, escapeSelector } from "unocss";
import * as fs from 'fs/promises';

// npx unocss "index.html" "netlify/functions/*.{js,ts}" "public/partials/*.html" "src/*.{js,ts}" -o src/styles/main.css

const config = defineConfig({
  rules: [
    // ['fill-current', { fill: 'currentColor' }],
    [/^stack\-?(\d*)(\w*)$/, ruleStack, {layer: "component"}],
    [/^stack\-?(\w*)$/, ruleStackFluid, {layer: "component"}],
    // [/^l-grid-?(.*)$/, ruleLayoutGrid, {layer: "component"}],
    // [/^sidebar\-button$/, ruleSidebarButton, {layer: "component"}],
    // [/^sidebar\-wrapper$/, ruleSidebarWrapper, {layer: "component"}],
    // [/^filter\-checkbox\-btn$/, ruleFilterCheckboxBtn, {layer: "component"}],
  ],
  shortcutsLayer: "component",
  preflights: [
    { getCSS: fileContent("src/css/main.css"), layer: 'reset' },
  ],
  layers: {
    reset: 0,
    base: 1,
    component: 2,
    default: 3,
  },
});

function fileContent(filename: string) {
  return async function() {
    const srcStyleCss = await fs.readFile(filename)
    return srcStyleCss.toString();
  }
}


async function ruleSidebarButton([], ctx) {
  const generator = ctx.generator;
  let result = ""
  const matched = generator.matchVariants("")
  const default_rules = [
    "block", "h-full", "px-3", "pt-1.5", "pb-0.5", "border-b-5",
    "text-gray-200", "bg-gray-900", "border-gray-900",
    "hover:text-gray-50", "hover:text-gray-50", "hover:border-gray-500",
    "focus:text-gray-50", "focus:text-gray-50", "focus:border-gray-500",
  ]

  const selectors = await generator.stringifyShortcuts(matched, ctx, default_rules)
  const escapedSelector = escapeSelector(ctx.rawSelector)
  for (const [,selector, css_body] of selectors) {
    result += selector.replace(".", "." + escapedSelector)
    result += `{${css_body}}\n`
  }

  const [[,,css_body]] = await generator.stringifyShortcuts(matched, ctx, ["border-violet-700"])
  result += `.${escapedSelector}[aria-expanded="true"] {${css_body}}`
  return result
}

async function ruleSidebarWrapper([], ctx) {
  const generator = ctx.generator;
  let result = ""
  const matched = generator.matchVariants("")
  const classSelector = "." + escapeSelector(ctx.rawSelector)
  {
    const default_rules = ["h-screen", "pt-11", "pb-2", "absolute", "top-0", "left-full", "max-w-20rem", "w-full", "transform", "-z-10"]
    const [[,,css_body]] = await generator.stringifyShortcuts(matched, ctx, default_rules)
    result += `${classSelector}{${css_body}transition: visibility 150ms, opacity 150ms, transform 150ms;}\n`
  }
  {
    const [[,,css_body]] = await generator.stringifyShortcuts(matched, ctx, ["translate-x-0", "opacity-0", "invisible"])
    result += `[aria-expanded="false"] ~ ${classSelector}{${css_body}}\n`
  }
  {
    const [[,,css_body]] = await generator.stringifyShortcuts(matched, ctx, ["opacity-100", "visible"])
    result += `[aria-expanded="true"] ~ ${classSelector}{${css_body};--un-translate-x:-100%;}\n`
  }
  return result
}

async function ruleFilterCheckboxBtn([], ctx) {
  const generator = ctx.generator;
  let result = ""
  const matched = generator.matchVariants("")
  const classSelector = "." + escapeSelector(ctx.rawSelector)
  {
    const default_rules = ["p-1", "border-r-2", "border-truegray-50"]
    const [[,,css_body]] = await generator.stringifyShortcuts(matched, ctx, default_rules)
    result += `${classSelector}{${css_body}}\n`
  }
  {
    const [[,,css_body]] = await generator.stringifyShortcuts(matched, ctx, ["bg-lime-300"])
    result += `${classSelector}.archive.checked > span{${css_body}}\n`
  }
  {
    const [[,,css_body]] = await generator.stringifyShortcuts(matched, ctx, ["bg-sky-300"])
    result += `${classSelector}.upload.checked > span{${css_body}}\n`
  }
  {
    const [[,,css_body]] = await generator.stringifyShortcuts(matched, ctx, ["bg-amber-300"])
    result += `${classSelector}.highlight.checked > span{${css_body}}\n`
  }
  
  return result
}

function ruleStack([selector, nr, unit]: RegExpMatchArray) {
  const classSelector = "." + escapeSelector(selector)
  const css_attr = "--stack-space"

  if (nr === '' && unit === '') {
    return `
${classSelector} { display: flex; flex-direction: column; justify-content: flex-start; }
${classSelector} > template:first-child + * {
  margin-top: 0;
}

${classSelector} > * + * { margin-top: var(${css_attr}, 1em); }
    `
  }

  if (unit !== '') return `${classSelector} { ${css_attr}: ${nr}${unit}; }`
  if (nr !== '') return `${classSelector} { ${css_attr}: ${+nr / 4}rem; }`

  console.error(`Failed to generate CSS for '${classSelector}'`)
  return `/* Failed to generate stack rule from ${selector} */`
}

function ruleStackFluid([selector, size]: RegExpMatchArray) {
  const classSelector = "." + escapeSelector(selector)
  const var_name = `--space-${size}`;

    return `
${classSelector} { display: flex; flex-direction: column; justify-content: flex-start; }
${classSelector} > template + * {
  margin-top: 0;
}

${classSelector} > * + * { margin-top: var(${var_name}, 1em); }
    `
}

async function ruleLayoutGrid([selector, min_width], ctx) {
  const generator = ctx.generator;
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

  const  attrs = await generator.parseUtil(min_width, ctx)
  const value = attrs[0][2][0][1]
  if (value) return `${classSelector} { --grid-min: ${value} }`

  console.error(`Failed to generate CSS for '${classSelector}'`)
  return `/* Failed to generate l-grid rule from ${selector} */`
}

export default config
