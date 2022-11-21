import { defineConfig, escapeSelector } from "unocss";

// TODO: add clamp and truncate rules
const config = defineConfig({
  rules: [
    [/^stack\-?(\d*)(\w*)$/, ruleStack, {layer: "component"}],
    [/^l-grid-?(.*)$/, ruleLayoutGrid, {layer: "component"}],
    [/^fluid-(p|m)(\w)?-(.*)$/, fluidSpace, {layer: "component"}],
    [/^clamp-?(\d)$/, ruleClamp, {layer: "component"}],
    ["debug-resize", {overflow: "scroll", resize: "both"}, {layer: "component"}],
  ],
});

function dirToWords(dir: string) {
  let result: string[] = [];
  if (dir === "t") {
    result.push("top");
  } else if (dir === "r") {
    result.push("right");
  } else if (dir === "bottom") {
    result.push("bottom");
  } else if (dir === "l") {
    result.push("left");
  } else if (dir === "x") {
    result.push("left", "right");
  } else if (dir === "y") {
    result.push("top", "bottom");
  }
  return result;
}

function ruleClamp([selector, nr]: RegExpMatchArray) {
  const classSelector = "." + escapeSelector(selector)
  
  return `
${classSelector} {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  -webkit-line-clamp: ${nr};
}
  `;
}

function fluidSpace([selector, attr, dir, variable]: RegExpMatchArray) {
  const classSelector = "." + escapeSelector(selector)
  let property = "";
  if (attr === "m") {
    property = "margin";
  } else if (attr === "p") {
    property = "padding";
  } else {
    console.error(`Failed to generate CSS for '${classSelector}'`)
    return;
  }
  const css_attr = "--space-" + variable;
  if (dir) {
    let result = "";
    const dirs = dirToWords(dir);
    if (dirs.length === 0) {
      console.error(`Invalid margin/padding direction was provided '${dir}'. Valid values: t, r, b, l, x, y`);
      return;
    }
    for (const d of dirs) {
      result += `${classSelector} { ${property}-${d}: var(${css_attr}); }`
    }
    return result;
  }
  return `
${classSelector} { ${property}: var(${css_attr}); }
    `;
}

function ruleStack([selector, nr, unit_or_fluid]: RegExpMatchArray) {
  const classSelector = "." + escapeSelector(selector)
  const css_attr = "--stack-space"

  if (nr === '' && unit_or_fluid === '') {
    return `
${classSelector} { display: flex; flex-direction: column; justify-content: flex-start; }
${classSelector} > template:first-child + * {
  margin-top: 0;
}

${classSelector} > * + * { margin-top: var(${css_attr}, 1em); }
    `
  }
  
  if (nr === '' && unit_or_fluid) {
    // Is fluid value
    const var_name = `--space-${unit_or_fluid}`;
    return `${classSelector} { ${css_attr}: var(${var_name}); }`
  } else if (unit_or_fluid !== '') {
    return `${classSelector} { ${css_attr}: ${nr}${unit_or_fluid}; }`
  } else if (nr !== '') {
    return `${classSelector} { ${css_attr}: ${+nr / 4}rem; }`
  }

  console.error(`Failed to generate CSS for '${classSelector}'`)
  return `/* Failed to generate stack rule from ${selector} */`
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
@supports (width: min(var(--l-grid-min), 100%)) {
  ${classSelector} { grid-template-columns: repeat(auto-fill, minmax(min(var(--l-grid-min), 100%), 1fr)); }
}
    `
  }

  const  attrs = await generator.parseUtil(min_width, ctx)
  const value = attrs[0][2][0][1]
  if (value) return `${classSelector} { --l-grid-min: ${value} }`

  console.error(`Failed to generate CSS for '${classSelector}'`)
  return `/* Failed to generate grid rule from ${selector} */`
}

export default config
