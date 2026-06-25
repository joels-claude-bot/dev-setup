// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import mermaid from 'astro-mermaid';

// https://astro.build/config
export default defineConfig({
	// Bind to all interfaces so the Tailscale hostname can reach the dev server.
	server: { host: true, port: 9043, allowedHosts: '0.0.0.0'  },
	// Vite blocks requests with an unknown Host header by default; allow the tailnet name.
	vite: {
		server: { allowedHosts: ['streaming-server.rove-lydian.ts.net'] },
		preview: { allowedHosts: ['streaming-server.rove-lydian.ts.net'] },
	},
	integrations: [
		// On Astro 5 the markdown processor runs rehype plugins, so astro-mermaid
		// transforms ```mermaid fences natively — no client-side workaround needed.
		mermaid({ theme: 'default', autoTheme: true }),
		starlight({
			title: "Joel's Dev Setup (MDX)",
			customCss: ['./src/styles/custom.css'],
			// mkdocs showed deep TOC entries; include H4 so pages like networking
			// (Resolv -> Dig/Getent/ss/diagrams) keep their sub-section links.
			tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 4 },
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/joeledwardson/dev-setup' }],
			// Starlight 0.39+ requires autogenerate nested inside `items` (the
			// group-level `autogenerate` form was removed).
			sidebar: [
				{ label: 'MD vs MDX demo', items: [{ label: 'What MDX adds', slug: 'demo' }] },
				{ label: 'Dev Log', items: [{ autogenerate: { directory: 'dev-log' } }] },
				{ label: 'NixOS', items: [{ autogenerate: { directory: 'nix' } }] },
				{ label: 'Reference', items: [{ autogenerate: { directory: 'reference' } }] },
				{ label: 'ADRs', items: [{ autogenerate: { directory: 'appendix/adr' } }] },
				{ label: 'Reviews', items: [{ autogenerate: { directory: 'appendix/reviews' } }] },
			],
		}),
		react(),
	],
});
