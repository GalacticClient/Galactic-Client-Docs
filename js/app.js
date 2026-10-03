let docs = null;
let currentModule = null;
let expandedCategories = new Set();

const sidebar = document.getElementById("sidebar");
const search = document.getElementById("search");
const content = document.getElementById("content");
const crumbCurrent = document.getElementById("crumb-current");
const homeButton = document.getElementById("home-button");
const sidebarCount = document.getElementById("sidebar-count");

async function loadDocs() {
const response = await fetch("modules.json");
if (!response.ok) {
throw new Error("Unable to load modules.json");
}
docs = await response.json();
sidebarCount.textContent = `${docs.module_count} modules`;
renderSidebar();
renderHome();
}

function renderSidebar(filter = "") {
sidebar.innerHTML = "";
const term = filter.trim().toLowerCase();
const groups = {};

for (const module of docs.modules) {
const matches = !term ||
module.name.toLowerCase().includes(term) ||
module.category.toLowerCase().includes(term);
if (!matches) continue;
if (!groups[module.category]) groups[module.category] = [];
groups[module.category].push(module);
}

const searching = term.length > 0;

for (const category of Object.keys(groups).sort()) {
const wrapper = document.createElement("div");
wrapper.className = "nav-category";

const title = document.createElement("button");
title.type = "button";
title.className = "nav-category-title";
title.textContent = category;

const count = groups[category].length;
const isExpanded = searching || expandedCategories.has(category);
title.classList.toggle("expanded", isExpanded);

title.addEventListener("click", () => {
if (expandedCategories.has(category)) {
expandedCategories.delete(category);
} else {
expandedCategories.add(category);
}
renderSidebar(filter);
});

wrapper.appendChild(title);

const list = document.createElement("div");
list.className = "nav-module-list";
list.style.display = isExpanded ? "block" : "none";

groups[category].sort((a, b) => a.name.localeCompare(b.name));

for (const module of groups[category]) {
const button = document.createElement("button");
button.type = "button";
button.className = "nav-module";
button.textContent = module.name;
button.addEventListener("click", () => showModule(module));
list.appendChild(button);
}

wrapper.appendChild(list);
sidebar.appendChild(wrapper);
}

if (!sidebar.children.length) {
const empty = document.createElement("div");
empty.className = "empty";
empty.textContent = "No modules found.";
sidebar.appendChild(empty);
}

highlightActive();
}

function renderHome() {
currentModule = null;
crumbCurrent.textContent = "Documentation";

const categoryCount = Object.keys(docs.categories).length;

content.innerHTML = `
<div class="hero">
<div class="eyebrow">GALACTIC CLIENT</div>
<h1>Documentation</h1>
<p>Reference for Galactic Client modules and categories.</p>
<a class="download-btn" href="https://github.com/GalacticClient/Galactic-Client" target="_blank" rel="noopener">Download</a>
</div>
<div class="stats">
<div class="stat">
<div class="stat-value">${docs.module_count}</div>
<div class="stat-label">Modules</div>
</div>
<div class="stat">
<div class="stat-value">${categoryCount}</div>
<div class="stat-label">Categories</div>
</div>
</div>
<div class="section">
<h2 class="section-title">Categories</h2>
<div class="category-grid" id="category-grid"></div>
</div>
`;

const grid = document.getElementById("category-grid");

for (const [category, count] of Object.entries(docs.categories).sort(([a], [b]) => a.localeCompare(b))) {
const card = document.createElement("div");
card.className = "category-card";
card.innerHTML = `
<div class="category-name">${escapeHtml(category)}</div>
<div class="category-count">${count} module${count === 1 ? "" : "s"}</div>
`;
card.addEventListener("click", () => {
search.value = "";
expandedCategories.add(category);
renderSidebar();
const first = docs.modules.find(module => module.category === category);
if (first) showModule(first);
});
grid.appendChild(card);
}

highlightActive();
}

function showModule(module) {
currentModule = module;
crumbCurrent.textContent = module.name;

content.innerHTML = `
<div class="module-page">
<div class="module-category">${escapeHtml(module.category)}</div>
<h1 class="module-title">${escapeHtml(module.name)}</h1>
<div class="section">
<h2 class="section-title">Description</h2>
<div class="module-description" id="module-desc">Loading...</div>
</div>
${renderSettings(module.settings)}
</div>
`;

highlightActive();
window.scrollTo({ top: 0, behavior: "smooth" });


fetchModuleMarkdown(module);
}

function fetchModuleMarkdown(module) {
const descEl = document.getElementById("module-desc");
if (!descEl) return;


const safeName = module.name.replace(/\//g, "-").replace(/\\/g, "-");
const mdUrl = `modules/${module.category_id}/${safeName}.md?v=${Date.now()}`;

fetch(mdUrl)
.then(response => {
if (!response.ok) throw new Error("Not found");
return response.text();
})
.then(md => {
const description = parseDescriptionSection(md);
descEl.innerHTML = description;
})
.catch(() => {
descEl.innerHTML = '<span class="muted">No description yet.</span>';
});
}

function parseDescriptionSection(md) {

const descMatch = md.match(/## Description\s*\n([\s\S]*?)(?=\n## |\n$|$)/);
if (!descMatch) return '<span class="muted">No description yet.</span>';

let text = descMatch[1].trim();
if (!text) return '<span class="muted">No description yet.</span>';



text = text
.replaceAll("&", "&amp;")
.replaceAll("<", "&lt;")
.replaceAll(">", "&gt;");


text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
`<pre><code>${code.trim()}</code></pre>`);


text = text.replace(/`([^`]+)`/g, "<code>$1</code>");


text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");


text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");


text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
'<a href="$2" target="_blank" rel="noopener">$1</a>');


text = text.split(/\n\n+/).map(para =>
para.trim() ? `<p>${para.replace(/\n/g, "<br>")}</p>` : ""
).join("");

return text;
}

function renderSettings(settings) {
if (!Array.isArray(settings) || settings.length === 0) {
return `
<div class="section">
<h2 class="section-title">Settings</h2>
<div class="empty">No settings documented.</div>
</div>
`;
}

return `
<div class="section">
<h2 class="section-title">Settings</h2>
<table class="settings-table">
<thead>
<tr>
<th>Name</th>
<th>Type</th>
<th>Default</th>
</tr>
</thead>
<tbody>
${settings.map(setting => `
<tr>
<td>${escapeHtml(setting.name ?? "-")}</td>
<td>${escapeHtml(setting.type ?? "-")}</td>
<td>${escapeHtml(String(setting.default ?? "-"))}</td>
</tr>
`).join("")}
</tbody>
</table>
</div>
`;
}

function highlightActive() {
document.querySelectorAll(".nav-module").forEach(button => {
const isActive = currentModule && button.textContent === currentModule.name;
button.classList.toggle("active", Boolean(isActive));
});
}

function escapeHtml(value) {
return String(value)
.replaceAll("&", "&amp;")
.replaceAll("<", "&lt;")
.replaceAll(">", "&gt;")
.replaceAll('"', "&quot;")
.replaceAll("'", "&#039;");
}

search.addEventListener("input", () => renderSidebar(search.value));
homeButton.addEventListener("click", renderHome);

loadDocs().catch(error => {
content.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
});
