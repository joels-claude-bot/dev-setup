// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import mermaid from 'astro-mermaid';

// https://astro.build/config
export default defineConfig({
	// Bind to all interfaces so the Tailscale hostname can reach the dev server.
	server: { host: true, port: 9043 },
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
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/joeledwardson/dev-setup' }],
			sidebar: [
				{ label: 'MD vs MDX demo', items: [{ label: 'What MDX adds', slug: 'demo' }] },
				{ label: 'Dev Log', autogenerate: { directory: 'dev-log' } },
				{ label: 'NixOS', autogenerate: { directory: 'nix' } },
				{ label: 'Reference', autogenerate: { directory: 'reference' } },
				{ label: 'ADRs', autogenerate: { directory: 'appendix/adr' } },
				{ label: 'Reviews', autogenerate: { directory: 'appendix/reviews' } },
			],
		}),
		react(),
	],
});
