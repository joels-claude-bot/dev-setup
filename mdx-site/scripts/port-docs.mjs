// Ports the mkdocs `docs/` tree into the Starlight content collection.
//   - rewrites frontmatter to just { title } (Starlight rejects unknown keys)
//   - derives title from frontmatter / first H1 / overrides, strips that H1
//   - converts mkdocs admonitions (!!! / ??? collapsible) -> Starlight :::asides
//   - flattens mkdocs content tabs (=== "Label") -> bold subsections
// observability.md is skipped — it is hand-authored as .mdx with a React island.
import fs from 'node:fs';
import path from 'node:path';

const SRC = '/home/claude/dev-setup/docs';
const DEST = '/home/claude/dev-setup/mdx-site/src/content/docs';
const SKIP = new Set(['reference/observability.md']);

const TITLE_OVERRIDES = {
	'index.md': 'Home',
	'dev-log/index.md': 'Dev Log',
	'reference/index.md': 'Reference',
	'reference/vim.md': 'Vim & Neovim',
	'reference/linux.md': 'Linux & System',
	'reference/shell.md': 'Shell & Bash',
	'reference/networking.md': 'Networking',
	'nix/notes.md': 'NixOS notes',
	'appendix/adr/index.md': 'Architecture Decision Records',
	'appendix/reviews/index.md': 'Reviews',
};

const asideType = (t) => {
	t = t.toLowerCase();
	if (['tip', 'hint', 'important', 'abstract', 'summary', 'success', 'example'].includes(t)) return 'tip';
	if (['warning', 'caution', 'attention'].includes(t)) return 'caution';
	if (['danger', 'error', 'bug', 'failure'].includes(t)) return 'danger';
	return 'note';
};

const dedent = (l) => l.replace(/^(\t| {4})/, '');
const isIndented = (l) => l.trim() === '' || /^(\t| {4})/.test(l);

function transform(lines) {
	const out = [];
	let i = 0;
	while (i < lines.length) {
		const line = lines[i];
		// marker (!!! static / ??? collapsible), optional + (open by default), type, optional "Title"
		const adm = line.match(/^(!{3}|\?{3})(\+)?\s+([\w-]+)(?:\s+"([^"]*)")?\s*$/);
		const tab = line.match(/^===\s+"([^"]*)"\s*$/);
		if (adm || tab) {
			i++;
			const body = [];
			while (i < lines.length && isIndented(lines[i])) {
				body.push(lines[i].trim() === '' ? '' : dedent(lines[i]));
				i++;
			}
			while (body.length && body[body.length - 1] === '') body.pop();
			if (adm) {
				const collapsible = adm[1] === '???';
				const type = adm[3];
				const title = adm[4] || type[0].toUpperCase() + type.slice(1);
				if (collapsible) {
					// ??? is a collapsible block in mkdocs; Starlight asides don't collapse,
					// so use a native <details> disclosure (open by default for ???+).
					const open = adm[2] === '+' ? ' open' : '';
					out.push(`<details${open}>`, `<summary>${title}</summary>`, '', ...transform(body), '', '</details>', '');
				} else {
					out.push(`:::${asideType(type)}${adm[4] ? `[${adm[4]}]` : ''}`, ...transform(body), ':::', '');
				}
			} else {
				out.push(`**${tab[1]}**`, '', ...transform(body), '');
			}
		} else {
			out.push(line);
			i++;
		}
	}
	return out;
}

function parseFrontmatter(text) {
	if (text.startsWith('---')) {
		const end = text.indexOf('\n---', 3);
		if (end !== -1) {
			const fm = text.slice(3, end).trim();
			const body = text.slice(end + 4).replace(/^\n+/, '');
			const data = {};
			for (const l of fm.split('\n')) {
				const m = l.match(/^([\w-]+):\s*(.*)$/);
				if (m) data[m[1]] = m[2].replace(/^["']|["']$/g, '');
			}
			return { data, body };
		}
	}
	return { data: {}, body: text };
}

const titleCase = (slug) => slug.split('-').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');

// ADRs and reviews get SHORT titles derived from the filename, not the verbose H1.
function conciseTitle(rel) {
	let m = rel.match(/^appendix\/adr\/(\d+)-(.+)\.md$/);
	if (m) return `ADR-${m[1]} — ${titleCase(m[2])}`;
	m = rel.match(/^appendix\/reviews\/(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
	if (m) return `${m[1]} — ${titleCase(m[2])}`;
	return null;
}

// mkdocs links to `foo.md` must become Starlight routes `foo/` (with trailing slash).
function rewriteLinks(text) {
	return text.replace(/\]\(([^)\s#]+?)\.md(#[^)]*)?\)/g, (whole, p, frag) => {
		let route = p.replace(/(^|\/)index$/, '$1');
		if (route === '') route = './';
		if (!route.endsWith('/')) route += '/';
		return `](${route}${frag || ''})`;
	});
}

function deriveTitle(rel, data, body) {
	const concise = conciseTitle(rel);
	if (concise) return { title: concise, body: stripFirstH1(body).body };
	if (TITLE_OVERRIDES[rel]) return { title: TITLE_OVERRIDES[rel], body: stripFirstH1(body).body };
	if (data.title) return { title: data.title, body: stripFirstH1(body).body };
	const h1 = stripFirstH1(body);
	if (h1.title) return { title: h1.title, body: h1.body };
	return { title: path.basename(rel, '.md'), body };
}

function stripFirstH1(body) {
	const lines = body.split('\n');
	for (let j = 0; j < lines.length; j++) {
		if (lines[j].trim() === '') continue;
		const m = lines[j].match(/^#\s+(.+?)\s*$/);
		if (m) {
			lines.splice(j, 1);
			if (lines[j] === '') lines.splice(j, 1);
			return { title: m[1], body: lines.join('\n') };
		}
		break; // first non-blank line is not an H1
	}
	return { title: null, body };
}

function walk(dir) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === 'assets' || entry.name === 'stylesheets') continue;
			walk(full);
		} else if (entry.name.endsWith('.md')) {
			const rel = path.relative(SRC, full);
			if (SKIP.has(rel)) continue;
			const raw = fs.readFileSync(full, 'utf8');
			const { data, body } = parseFrontmatter(raw);
			const { title, body: noTitle } = deriveTitle(rel, data, body);
			const transformed = rewriteLinks(transform(noTitle.split('\n')).join('\n'));
			const outPath = path.join(DEST, rel);
			fs.mkdirSync(path.dirname(outPath), { recursive: true });
			fs.writeFileSync(outPath, `---\ntitle: ${JSON.stringify(title)}\n---\n\n${transformed}`);
			console.log(`ported ${rel} -> title ${JSON.stringify(title)}`);
		}
	}
}

walk(SRC);
console.log('done');
