import { useMemo, useState } from 'react';

// A real React island: filter the homelab observability tools by what signal they
// answer and how they're hosted, then expand any card for its pros/cons. Data is
// lifted straight from the "Observability & monitoring" reference page.

type Signal = 'Liveness' | 'Metrics' | 'Logs/Traces' | 'Process';
type Hosting = 'Self-host' | 'SaaS' | 'Native';
type Effort = 'Tiny' | 'Low' | 'Medium' | 'High';

interface Tool {
	name: string;
	tier: string;
	signals: Signal[];
	hosting: Hosting[];
	effort: Effort;
	blurb: string;
	pros: string[];
	cons: string[];
}

const TOOLS: Tool[] = [
	{
		name: 'systemd (OnFailure / WatchdogSec)', tier: 'Tier 0', signals: ['Process'], hosting: ['Native'], effort: 'Tiny',
		blurb: 'Native NixOS unit hooks: notify on non-zero exit, restart a stuck daemon on missed watchdog.',
		pros: ['Zero new services', 'Built into every box', 'Catches errors + daemon hangs'],
		cons: ["Can't detect its own absence (dies with the box)", 'No trends, no UI'],
	},
	{
		name: 'Healthchecks.io', tier: 'Tier 1', signals: ['Liveness'], hosting: ['Self-host', 'SaaS'], effort: 'Tiny',
		blurb: "Dead-man's-switch: your job curls a ping URL on success; absence within period+grace fires.",
		pros: ['The one tool that catches "the cron never ran"', 'Hosted free tier or self-host', 'Near-zero maintenance'],
		cons: ['Liveness only — no host metrics', 'One check per job to wire up'],
	},
	{
		name: 'Uptime Kuma', tier: 'Tier 1', signals: ['Liveness'], hosting: ['Self-host'], effort: 'Low',
		blurb: 'Probes HTTP/TCP/ping/DNS (or receives push heartbeats), stores in SQLite, pretty status pages.',
		pros: ['Dead-simple, pretty status pages', 'Push monitors work for cron', '90+ notification integrations'],
		cons: ['Up/down + response time only', 'Not deep host resources'],
	},
	{
		name: 'Beszel', tier: 'Tier 2', signals: ['Metrics'], hosting: ['Self-host'], effort: 'Low',
		blurb: '~10 MB agent per host → small hub (PocketBase+SQLite) with dashboard and threshold alerts.',
		pros: ["Won't eat a constrained box", 'CPU/RAM/IOPS+SMART dashboard AND alerts in one', 'Lightweight middle ground'],
		cons: ['Younger project', 'Fixed metric set, no PromQL'],
	},
	{
		name: 'Netdata', tier: 'Tier 2', signals: ['Metrics'], hosting: ['Self-host'], effort: 'Low',
		blurb: 'Per-node agent: thousands of metrics at 1-second granularity, zero-config dashboard on :19999.',
		pros: ['Best instant dashboard, deep + gorgeous', 'Zero config', 'Built-in ML-anomaly alerts'],
		cons: ['RAM-growth bug on small boxes', 'UI now proprietary; dropped from Debian'],
	},
	{
		name: 'Prometheus + Grafana + Alertmanager', tier: 'Tier 2–3', signals: ['Metrics'], hosting: ['Self-host'], effort: 'High',
		blurb: 'The de-facto stack: exporters → Prometheus TSDB + rules → Grafana dashboards → Alertmanager routing.',
		pros: ['The standard; powerful PromQL', 'Huge dashboard + exporter ecosystem', 'Most flexible'],
		cons: ['Steepest learning curve', '4+ moving parts to run and break'],
	},
	{
		name: 'Axiom', tier: 'Tier 3', signals: ['Logs/Traces', 'Metrics'], hosting: ['SaaS'], effort: 'Low',
		blurb: 'Managed: ship via OTel/Vector → cheap object storage → query logs/metrics/traces with APL.',
		pros: ['No infra to run', 'Logs+metrics+traces in one UI', '500 GB/mo free tier'],
		cons: ['Data leaves the box', 'Vendor dependency'],
	},
	{
		name: 'SigNoz', tier: 'Tier 3', signals: ['Logs/Traces', 'Metrics'], hosting: ['Self-host'], effort: 'High',
		blurb: 'OpenTelemetry-native all-in-one: OTLP → ClickHouse → APM/traces/logs/dashboards in one UI.',
		pros: ['Own your data', 'All three signals together', 'The self-hostable Datadog shape'],
		cons: ['ClickHouse-sized footprint', 'Heavy to run'],
	},
];

const SIGNALS: Signal[] = ['Liveness', 'Metrics', 'Logs/Traces', 'Process'];
const HOSTINGS: Hosting[] = ['Self-host', 'SaaS', 'Native'];

const EFFORT_COLOR: Record<Effort, string> = {
	Tiny: '#16a34a', Low: '#65a30d', Medium: '#d97706', High: '#dc2626',
};

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
	return (
		<button
			onClick={onClick}
			style={{
				padding: '0.25rem 0.7rem', borderRadius: '999px', cursor: 'pointer', fontSize: '0.85rem',
				border: '1px solid var(--sl-color-gray-4)',
				background: active ? 'var(--sl-color-accent)' : 'transparent',
				color: active ? 'var(--sl-color-black)' : 'var(--sl-color-text)',
				fontWeight: active ? 600 : 400,
			}}
		>
			{label}
		</button>
	);
}

export default function ObservabilityExplorer() {
	const [signals, setSignals] = useState<Set<Signal>>(new Set());
	const [hostings, setHostings] = useState<Set<Hosting>>(new Set());
	const [open, setOpen] = useState<string | null>(null);

	const toggle = <T,>(set: Set<T>, value: T, update: (s: Set<T>) => void) => {
		const next = new Set(set);
		next.has(value) ? next.delete(value) : next.add(value);
		update(next);
	};

	const filtered = useMemo(
		() =>
			TOOLS.filter(
				(tool) =>
					(signals.size === 0 || tool.signals.some((s) => signals.has(s))) &&
					(hostings.size === 0 || tool.hosting.some((h) => hostings.has(h))),
			),
		[signals, hostings],
	);

	return (
		<div style={{ border: '1px solid var(--sl-color-gray-5)', borderRadius: '0.75rem', padding: '1.25rem', margin: '1.5rem 0' }}>
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1rem' }}>
				<div>
					<div style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.7, marginBottom: '0.4rem' }}>Signal answered</div>
					<div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
						{SIGNALS.map((s) => <Chip key={s} label={s} active={signals.has(s)} onClick={() => toggle(signals, s, setSignals)} />)}
					</div>
				</div>
				<div>
					<div style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.7, marginBottom: '0.4rem' }}>Hosting</div>
					<div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
						{HOSTINGS.map((h) => <Chip key={h} label={h} active={hostings.has(h)} onClick={() => toggle(hostings, h, setHostings)} />)}
					</div>
				</div>
			</div>

			<div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.75rem' }}>
				Showing {filtered.length} of {TOOLS.length} tools
				{(signals.size > 0 || hostings.size > 0) && (
					<button onClick={() => { setSignals(new Set()); setHostings(new Set()); }} style={{ marginLeft: '0.6rem', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--sl-color-accent-high)', textDecoration: 'underline' }}>
						clear filters
					</button>
				)}
			</div>

			<div style={{ display: 'grid', gap: '0.6rem' }}>
				{filtered.map((tool) => {
					const isOpen = open === tool.name;
					return (
						<div key={tool.name} style={{ border: '1px solid var(--sl-color-gray-5)', borderRadius: '0.5rem', overflow: 'hidden' }}>
							<button
								onClick={() => setOpen(isOpen ? null : tool.name)}
								style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: 'var(--sl-color-gray-6)', border: 'none', padding: '0.7rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--sl-color-white)' }}
							>
								<span style={{ fontWeight: 600, flex: 1 }}>{tool.name}</span>
								<span style={{ fontSize: '0.7rem', padding: '0.1rem 0.5rem', borderRadius: '999px', background: EFFORT_COLOR[tool.effort], color: '#fff' }}>{tool.effort} effort</span>
								<span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{tool.tier}</span>
								<span style={{ opacity: 0.6 }}>{isOpen ? '▾' : '▸'}</span>
							</button>
							<div style={{ padding: '0.7rem 0.9rem' }}>
								<p style={{ margin: '0 0 0.4rem' }}>{tool.blurb}</p>
								<div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', fontSize: '0.72rem' }}>
									{tool.signals.map((s) => <span key={s} style={{ padding: '0.1rem 0.45rem', borderRadius: '999px', border: '1px solid var(--sl-color-gray-4)' }}>{s}</span>)}
									{tool.hosting.map((h) => <span key={h} style={{ padding: '0.1rem 0.45rem', borderRadius: '999px', border: '1px solid var(--sl-color-gray-4)', opacity: 0.8 }}>{h}</span>)}
								</div>
								{isOpen && (
									<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.8rem' }}>
										<div>
											<strong style={{ color: '#16a34a' }}>Pros</strong>
											<ul style={{ margin: '0.3rem 0 0', paddingLeft: '1.1rem' }}>{tool.pros.map((p) => <li key={p}>{p}</li>)}</ul>
										</div>
										<div>
											<strong style={{ color: '#dc2626' }}>Cons</strong>
											<ul style={{ margin: '0.3rem 0 0', paddingLeft: '1.1rem' }}>{tool.cons.map((c) => <li key={c}>{c}</li>)}</ul>
										</div>
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
