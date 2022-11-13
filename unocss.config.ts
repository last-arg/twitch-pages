import { defineConfig, escapeSelector } from "unocss";
import * as fs from 'fs/promises';

// npx unocss "index.html" "netlify/functions/*.{js,ts}" "public/partials/*.html" "src/*.{js,ts}" -o src/styles/main.css

const config = defineConfig({
  rules: [
    [/^stack\-?(\d*)(\w*)$/, ruleStack, {layer: "component"}],
    [/^stack\-?(\w*)$/, ruleStackFluid, {layer: "component"}],
    [/^l-grid-?(.*)$/, ruleLayoutGrid, {layer: "component"}],
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

async function ruleLayoutGrid([selector, min_width]: RegExpMatchArray, ctx: any) {
  const generator = ctx.generator;
  const classSelector = "." + escapeSelector(selector)
  if (min_width === '') {
    return `
${classSelector} {
  display: grid;
  grid-gap: var(--l-grid-gap, 1em);
}
@supports (width: min(var(--grid-min), 100%)) {
  ${classSelector} { grid-template-columns: repeat(auto-fill, minmax(min(var(--l-grid-min), 100%), 1fr)); }
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
