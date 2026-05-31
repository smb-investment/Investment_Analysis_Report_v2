#!/usr/bin/env node
// 실행: node agent/md_to_html.js <input.md> <output.html>
// 산출물: CSS 인라인 임베드된 자가완결형 HTML. 외부 스크립트/추적기 미포함.
"use strict";

const fs = require("fs");
const path = require("path");
const MarkdownIt = require("markdown-it");

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error("Usage: node agent/md_to_html.js <input.md> <output.html>");
  process.exit(2);
}
if (!fs.existsSync(inPath)) {
  console.error(`Input not found: ${inPath}`);
  process.exit(2);
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: false,
});

// GFM-style task list (checkbox) — render "- [ ]" / "- [x]" as actual checkboxes
md.core.ruler.after("inline", "github-task-lists", function (state) {
  for (const token of state.tokens) {
    if (token.type !== "inline" || !token.children) continue;
    for (const child of token.children) {
      if (child.type !== "text") continue;
      const m = child.content.match(/^\s*\[( |x|X)\]\s+(.*)$/);
      if (!m) continue;
      const checked = m[1].toLowerCase() === "x";
      child.type = "html_inline";
      child.content = `<input type="checkbox" disabled${checked ? " checked" : ""} class="task-list-item-checkbox"> ${md.utils.escapeHtml(m[2])}`;
    }
  }
});

// Mark list items containing a task-list checkbox so CSS can hide the bullet
const defaultListItemRender = md.renderer.rules.list_item_open || function (tokens, idx, opts, env, self) {
  return self.renderToken(tokens, idx, opts);
};
md.renderer.rules.list_item_open = function (tokens, idx, opts, env, self) {
  const inline = tokens[idx + 2];
  if (inline && inline.type === "inline" && inline.children && inline.children[0]
      && inline.children[0].type === "html_inline"
      && inline.children[0].content.includes('class="task-list-item-checkbox"')) {
    tokens[idx].attrJoin("class", "task-list-item");
  }
  return defaultListItemRender(tokens, idx, opts, env, self);
};

const source = fs.readFileSync(inPath, "utf8");
const body = md.render(source);
const cssPath = path.join(__dirname, "report-theme.css");
if (!fs.existsSync(cssPath)) {
  console.error(`CSS not found: ${cssPath}`);
  process.exit(2);
}
const css = fs.readFileSync(cssPath, "utf8");

// Derive a title from the first H1 if available
const titleMatch = source.match(/^#\s+(.+?)\s*$/m);
const title = titleMatch ? titleMatch[1].replace(/[<>&]/g, "") : "투자 검토 보고서";

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta name="robots" content="noindex,nofollow">
<title>${title}</title>
<style>
${css}
</style>
</head>
<body>
<main class="report">
${body}
</main>
</body>
</html>
`;

fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
fs.writeFileSync(outPath, html, "utf8");
console.log(`생성 완료: ${outPath}  (${html.length.toLocaleString()} bytes)`);
