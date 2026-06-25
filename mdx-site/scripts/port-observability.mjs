// Generates reference/observability.mdx from the original mkdocs page: strips the
// H1, converts the one ??? admonition to a Starlight aside, fixes relative image
// paths for Astro, and injects the <ObservabilityExplorer> React island.
import fs from 'node:fs';

const src = '/home/claude/dev-setup/docs/reference/observability.md';
const dest = '/home/claude/dev-setup/mdx-site/src/content/docs/reference/observability.mdx';

let lines = fs.readFileSync(src, 'utf8').split('\n');

// 1. strip first H1
const h1 = lines.findIndex((l) => /^#\s+/.test(l));
if (h1 !== -1) { lines.splice(h1, 1); if (lines[h1] === '') lines.splice(h1, 1); }

// 2. convert ??? / !!! admonitions -> Starlight asides (de-indent body)
const out = [];
for (let i = 0; i < lines.length; i++) {
	const m = lines[i].match(/^(!{3}|\?{3})(\+)?\s+([\w-]+)(?:\s+"([^"]*)")?\s*$/);
	if (m) {
		const body = [];
		i++;
		while (i < lines.length && (lines[i].trim() === '' || /^(\t| {4})/.test(lines[i]))) {
			body.push(lines[i].trim() === '' ? '' : lines[i].replace(/^(\t| {4})/, ''));
			i++;
		}
		i--;
		while (body.length && body[body.length - 1] === '') body.pop();
		const title = m[4] || m[3];
		if (m[1] === '???') {
			// collapsible -> native <details> (markdown inside renders with blank-line separation)
			out.push(`<details${m[2] === '+' ? ' open' : ''}>`, `<summary>${title}</summary>`, '', ...body, '', '</details>', '');
		} else {
			out.push(`:::note[${title}]`, ...body, ':::', '');
		}
	} else {
		out.push(lines[i]);
	}
}

let text = out.join('\n');

// 3. fix relative image paths for Astro (resolve relative to this file)
text = text.replace(/\]\(assets\//g, '](./assets/').replace(/\]\(cpu-over-time\.svg/g, '](./cpu-over-time.svg');

// 3b. rewrite mkdocs `foo.md` links to Starlight routes `foo/` (leave external links alone)
text = text.replace(/\]\(([^)\s#]+?)\.md(#[^)]*)?\)/g, (whole, p, frag) => {
	if (/^(https?:)?\/\//.test(p)) return whole;
	let route = p.replace(/(^|\/)index$/, '$1');
	if (route === '') route = './';
	if (!route.endsWith('/')) route += '/';
	return `](${route}${frag || ''})`;
});

// 4. inject the React island right before the first tool subsection
const marker = '### Uptime Kuma';
const island = [
	'> **Try it:** the explorer below is a real React component — filter the tools by the signal they answer and how they\'re hosted, and expand any card for pros/cons.',
	'',
	'<ObservabilityExplorer client:load />',
	'',
].join('\n');
text = text.replace(marker, `${island}\n${marker}`);

// 5. frontmatter + import
const front = `---\ntitle: "Observability & monitoring"\n---\n\nimport ObservabilityExplorer from '../../../components/ObservabilityExplorer';\n\n`;

fs.writeFileSync(dest, front + text);
console.log('wrote', dest);
