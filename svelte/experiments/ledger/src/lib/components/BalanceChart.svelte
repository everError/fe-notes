<script lang="ts">
	import { compact, num } from '#lib/format';
	import type { RoutePoint } from '#lib/types';

	let {
		route,
		startAmount,
		today,
		daysInMonth
	}: {
		route: RoutePoint[];
		startAmount: number | null;
		today: string;
		daysInMonth: number;
	} = $props();

	const W = 720;
	const H = 240;
	const pad = { l: 46, r: 14, t: 18, b: 26 };

	/** 1, 2, 5 × 10^n 중 raw 이상인 가장 작은 값 */
	function niceStep(raw: number): number {
		const pow = 10 ** Math.floor(Math.log10(raw));
		const f = raw / pow;
		return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
	}

	const view = $derived.by(() => {
		const balances = route.map((p) => p.balance);
		const rawMax = Math.max(startAmount ?? 0, ...balances, 0);
		const rawMin = Math.min(...balances, 0);
		// 눈금이 떨어지는 값이 되도록 범위를 눈금 간격에 맞춰 넓힌다
		const step = niceStep((rawMax - rawMin || 1) / 4);
		const min = Math.floor(rawMin / step) * step;
		const max = Math.max(Math.ceil(rawMax / step) * step, min + step);
		const x = (day: number) =>
			pad.l + ((day - 1) / Math.max(daysInMonth - 1, 1)) * (W - pad.l - pad.r);
		const y = (b: number) => pad.t + ((max - b) / (max - min)) * (H - pad.t - pad.b);

		const past = route.filter((p) => p.date <= today);
		const last = past.length > 0 ? past[past.length - 1] : null;
		const pt = (p: RoutePoint) => `${x(p.day).toFixed(1)},${y(p.balance).toFixed(1)}`;
		const line = past.map((p, i) => `${i === 0 ? 'M' : 'L'}${pt(p)}`).join(' ');
		const area =
			past.length > 1
				? `${line} L${x(last!.day).toFixed(1)},${y(Math.max(min, 0)).toFixed(1)} L${x(past[0].day).toFixed(1)},${y(Math.max(min, 0)).toFixed(1)} Z`
				: null;
		const future =
			last && last.day < daysInMonth
				? `M${x(last.day).toFixed(1)},${y(last.balance).toFixed(1)} L${x(daysInMonth).toFixed(1)},${y(last.balance).toFixed(1)}`
				: null;

		const ticks: number[] = [];
		for (let t = min; t <= max + step / 2; t += step) ticks.push(t);
		return { x, y, line, area, future, last, ticks, min, max, past };
	});

	const xLabels = $derived(
		route.filter((p) => p.day === 1 || p.day % 5 === 0 || p.day === daysInMonth)
	);
</script>

<svg viewBox="0 0 {W} {H}" class="h-auto w-full" role="img" aria-label="날짜별 남은 돈 변화">
	<defs>
		<linearGradient id="bal-fill" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="var(--color-brand)" stop-opacity="0.22" />
			<stop offset="1" stop-color="var(--color-brand)" stop-opacity="0" />
		</linearGradient>
	</defs>

	{#each view.ticks as t (t)}
		<line
			x1={pad.l}
			x2={W - pad.r}
			y1={view.y(t)}
			y2={view.y(t)}
			stroke="var(--color-line)"
			stroke-width="1"
		/>
		<text
			x={pad.l - 8}
			y={view.y(t) + 3.5}
			text-anchor="end"
			font-size="10.5"
			fill="var(--color-mute)">{compact(t)}</text
		>
	{/each}

	{#if view.min < 0}
		<line
			x1={pad.l}
			x2={W - pad.r}
			y1={view.y(0)}
			y2={view.y(0)}
			stroke="var(--color-danger)"
			stroke-width="1"
			stroke-dasharray="4 4"
		/>
	{/if}
	{#if startAmount !== null}
		<line
			x1={pad.l}
			x2={W - pad.r}
			y1={view.y(startAmount)}
			y2={view.y(startAmount)}
			stroke="var(--color-faint)"
			stroke-width="1"
			stroke-dasharray="2 5"
		/>
	{/if}

	{#if view.area}<path d={view.area} fill="url(#bal-fill)" />{/if}
	{#if view.future}
		<path
			d={view.future}
			fill="none"
			stroke="var(--color-faint)"
			stroke-width="2"
			stroke-dasharray="3 6"
			stroke-linecap="round"
		/>
	{/if}
	<path
		d={view.line}
		fill="none"
		stroke="var(--color-brand)"
		stroke-width="2.5"
		stroke-linejoin="round"
		stroke-linecap="round"
	/>

	{#each route as p (p.day)}
		{#if p.hasFixed && p.date <= today}
			<circle
				cx={view.x(p.day)}
				cy={view.y(p.balance)}
				r="4.5"
				fill="var(--color-surface)"
				stroke="var(--color-ink)"
				stroke-width="1.5"
			/>
		{/if}
		<circle cx={view.x(p.day)} cy={view.y(p.balance)} r="9" fill="transparent">
			<title>{p.day}일 · {num(p.balance)}원{p.hasFixed ? ' · 고정지출 있음' : ''}</title>
		</circle>
	{/each}

	{#if view.last}
		<circle
			cx={view.x(view.last.day)}
			cy={view.y(view.last.balance)}
			r="5.5"
			fill="var(--color-brand)"
			stroke="var(--color-surface)"
			stroke-width="2.5"
		/>
	{/if}

	{#each xLabels as p (p.day)}
		<text x={view.x(p.day)} y={H - 6} text-anchor="middle" font-size="10.5" fill="var(--color-mute)"
			>{p.day}</text
		>
	{/each}
</svg>
