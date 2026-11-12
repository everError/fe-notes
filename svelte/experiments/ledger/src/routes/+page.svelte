<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '$app/forms';
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';
	import Icon from '#lib/components/Icon.svelte';
	import SaveProgress from '#lib/components/SaveProgress.svelte';
	import { SAVE_COLOR, INCOME_COLOR } from '#lib/categories';
	import {
		addMonths,
		compact,
		dateKey,
		dayLabel,
		daysInMonthOf,
		firstWeekdayOf,
		md,
		num,
		pad2,
		signed,
		weekdayOf,
		WEEKDAYS
	} from '#lib/format';
	import type { DayCell, Entry, Kind } from '#lib/types';

	let { data, form }: PageProps = $props();

	const KINDS: { kind: Kind; label: string }[] = [
		{ kind: 'spend', label: '지출' },
		{ kind: 'income', label: '입금' },
		{ kind: 'save', label: '저축' }
	];

	/* ---------------- 입력 상태 ---------------- */
	let formKind = $state<Kind>('spend');
	let pickedCategory = $state('');
	let formMethodId = $state('');
	const accounts = $derived(data.paymentMethods.filter((m) => m.kind === 'account'));
	const defaultAccountId = $derived(String(accounts[0]?.id ?? ''));
	let formGoalId = $state('');
	let amtInput = $state('');
	let memoInput = $state('');
	let addedFlash = $state(false);
	let amountEl = $state<HTMLInputElement>();
	let panelEl = $state<HTMLElement>();

	let editBuf = $state<{
		id: number;
		kind: Kind;
		amount: string;
		category: string;
		memo: string;
		methodId: string;
		goalId: string;
		installments: string;
	} | null>(null);
	let mode = $state<'entry' | 'pay' | 'transfer'>('entry'); // 날짜 패널의 입력 종류
	let formInstallments = $state('1');
	let trFrom = $state('');
	let trTo = $state('');
	let trAmount = $state('');
	let payCardSel = $state('');
	let payAmount = $state('');
	let payAccountId = $state('');

	/** 분류 칩 목록 — 종류별 */
	const catList = (k: Kind) => data.categories.filter((c) => k !== 'save' && c.kind === k);

	/** 현재 종류에서 쓸 수 있는 첫 분류로 맞춘다 */
	function normalizeCategory(k: Kind, current: string): string {
		if (k === 'save') return '저축';
		const list = catList(k);
		return list.some((c) => c.name === current) ? current : (list[0]?.name ?? '');
	}

	// 고른 분류가 현재 종류에 없으면 그 종류의 첫 분류로 보정한다
	const formCategory = $derived(normalizeCategory(formKind, pickedCategory));

	/* 날짜·달이 바뀌면 열려 있는 편집기를 닫는다 */
	$effect(() => {
		void data.month;
		void data.selectedDate;
		editBuf = null;
		mode = 'entry';
	});

	/* 좁은 화면에서는 날짜를 누르면 기록 패널로 이동한다 */
	afterNavigate(({ type }) => {
		if (type === 'link' && window.innerWidth < 1280) {
			panelEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	});

	/* ---------------- 파생 값 ---------------- */
	const todayMonth = $derived(data.today.slice(0, 7));
	const todayDay = $derived(Number(data.today.slice(8, 10)));
	const selectedIsFuture = $derived(data.selectedDate > data.today);
	const selectedIsToday = $derived(data.selectedDate === data.today);
	const catColor = $derived(Object.fromEntries(data.categories.map((c) => [c.name, c.color])));
	const colorOf = (e: Entry) =>
		e.kind === 'income'
			? INCOME_COLOR
			: e.kind === 'save'
				? SAVE_COLOR
				: (catColor[e.category] ?? '#6B7280');

	const gauge = $derived.by(() => {
		if (data.startAmount === null || data.balance === null) return null;
		const { startAmount: start, balance } = data;
		const pct =
			start > 0 ? Math.max(0, Math.min(100, (balance / start) * 100)) : null; // 월초가 0 이하면 비율을 말할 수 없다
		return { start, balance, pct, low: balance < 0 || (pct !== null && pct <= 20) };
	});

	const budgetBy = $derived(Object.fromEntries(data.budgets.map((b) => [b.name, b])));
	const selectedBudget = $derived(formKind === 'spend' ? (budgetBy[formCategory] ?? null) : null);

	/** 남은 날 기준 하루·이번 주 사용 가능액 — 이번 달에만 계산한다 */
	const pace = $derived.by(() => {
		if (!data.todayInMonth || data.balance === null) return null;
		const remainingDays = data.daysInMonth - todayDay + 1; // 오늘 포함
		const unrecordedFixed = data.fixedDefs
			.filter((d) => !data.recordedFixedIds.includes(d.id))
			.reduce((sum, d) => sum + d.amount, 0);
		const available = data.balance - unrecordedFixed;
		const daily = Math.floor(available / remainingDays);
		const weekday = new Date(`${data.today}T00:00:00`).getDay();
		const weekDaysLeft = Math.min(7 - weekday, remainingDays); // 오늘부터 토요일까지
		return { remainingDays, unrecordedFixed, available, daily, weekDaysLeft };
	});

	/** 지난달 같은 기간과 비교한 지출 증감 */
	const spendDelta = $derived(
		data.compare.days > 0 ? data.spendTotal - data.compare.prevSpendTotal : null
	);

	const weeks = $derived.by(() => {
		const rows: (DayCell | null)[][] = [];
		let row: (DayCell | null)[] = Array<DayCell | null>(firstWeekdayOf(data.month)).fill(null);
		for (const cell of data.byDay) {
			row.push(cell);
			if (row.length === 7) {
				rows.push(row);
				row = [];
			}
		}
		if (row.length > 0) rows.push([...row, ...Array<null>(7 - row.length).fill(null)]);
		return rows;
	});

	/** 칸 안에 찍을 분류 점 — 금액이 큰 순서로 최대 4개 */
	function dots(cell: DayCell): string[] {
		const sums: Record<string, number> = {};
		for (const e of cell.entries) {
			if (e.kind !== 'spend') continue;
			sums[e.category] = (sums[e.category] ?? 0) + e.amount;
		}
		return Object.entries(sums)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 4)
			.map(([name]) => catColor[name] ?? '#6B7280');
	}

	/* ---------------- 달력 보조 정보 ---------------- */
	/** 그 달에서 가장 많이 쓴 날 — 칸 배경의 진하기 기준 */
	const maxDaySpend = $derived(Math.max(1, ...data.byDay.map((c) => c.spend)));
	const pastDays = $derived(data.byDay.filter((c) => c.date <= data.today));
	const elapsedDays = $derived(pastDays.length);
	const noSpendDays = $derived(pastDays.filter((c) => c.spend === 0).length);
	const dailyAvg = $derived(
		elapsedDays > 0 ? Math.round(pastDays.reduce((s, c) => s + c.spend, 0) / elapsedDays) : 0
	);
	const topDay = $derived(
		pastDays.reduce<DayCell | null>((best, c) => (!best || c.spend > best.spend ? c : best), null)
	);

	/** 한 주(달력 한 줄)의 합계 */
	function weekSum(row: (DayCell | null)[]) {
		const cells = row.filter((c): c is DayCell => c !== null);
		return {
			spend: cells.reduce((s, c) => s + c.spend, 0),
			income: cells.reduce((s, c) => s + c.income, 0),
			noSpend: cells.filter((c) => c.date <= data.today && c.spend === 0).length
		};
	}
	/** 이번 달이면 이번 주 지출, 지난 달이면 가장 많이 쓴 주 */
	const weekFocus = $derived.by(() => {
		if (data.todayInMonth) {
			const row = weeks.find((r) => r.some((c) => c?.date === data.today));
			return row ? weekSum(row).spend : 0;
		}
		return Math.max(0, ...weeks.map((r) => weekSum(r).spend));
	});

	type Plan = { date: string; label: string; amount: number; kind: 'fixed' | 'card' };
	/** 아직 기록하지 않은 고정지출과 카드 결제일 — 날짜별 */
	const plannedByDate = $derived.by(() => {
		const map = new Map<string, Plan[]>();
		const push = (p: Plan) => map.set(p.date, [...(map.get(p.date) ?? []), p]);
		for (const d of data.fixedDefs) {
			if (data.recordedFixedIds.includes(d.id)) continue;
			const date = `${data.month}-${pad2(Math.min(d.day, data.daysInMonth))}`;
			if (date >= data.today) push({ date, label: d.name, amount: d.amount, kind: 'fixed' });
		}
		for (const c of data.cardDebts) {
			if (c.payDay === null) continue;
			for (const [m, amount] of [
				[c.bill.month, c.bill.due],
				[c.bill.nextMonth, c.bill.next]
			] as const) {
				if (amount <= 0) continue;
				const date = `${m}-${pad2(Math.min(c.payDay, daysInMonthOf(m)))}`;
				if (date >= data.today) push({ date, label: c.name, amount, kind: 'card' });
			}
		}
		return map;
	});

	/** 앞으로 30일 안의 고정지출·카드 결제 (이번 달을 보고 있을 때) */
	const upcoming = $derived.by(() => {
		if (!data.todayInMonth) return [];
		const base = new Date(`${data.today}T00:00:00`);
		const end = new Date(base);
		end.setDate(end.getDate() + 30);
		const endKey = dateKey(end);
		const dday = (date: string) =>
			Math.round((new Date(`${date}T00:00:00`).getTime() - base.getTime()) / 86_400_000);
		const list: (Plan & { dday: number })[] = [];
		const nextM = addMonths(data.month, 1);
		for (const d of data.fixedDefs) {
			for (const m of [data.month, nextM]) {
				if (m === data.month && data.recordedFixedIds.includes(d.id)) continue;
				const date = `${m}-${pad2(Math.min(d.day, daysInMonthOf(m)))}`;
				if (date >= data.today && date <= endKey)
					list.push({ date, label: d.name, amount: d.amount, kind: 'fixed', dday: dday(date) });
			}
		}
		for (const [date, plans] of plannedByDate)
			for (const p of plans) if (p.kind === 'card' && date <= endKey) list.push({ ...p, dday: dday(date) });
		// 다음 달 카드 결제일도 30일 안이면 넣는다(이번 달 표에는 없는 날)
		for (const c of data.cardDebts) {
			if (c.payDay === null || c.bill.next <= 0) continue;
			const date = `${c.bill.nextMonth}-${pad2(Math.min(c.payDay, daysInMonthOf(c.bill.nextMonth)))}`;
			if (date <= endKey && !list.some((x) => x.kind === 'card' && x.date === date && x.label === c.name))
				list.push({ date, label: c.name, amount: c.bill.next, kind: 'card', dday: dday(date) });
		}
		return list.sort((x, y) => x.date.localeCompare(y.date) || x.label.localeCompare(y.label));
	});
	const upcomingTotal = $derived(upcoming.reduce((s, u) => s + u.amount, 0));

	const pendingFixed = $derived.by(() => {
		const dueDay = data.todayInMonth ? todayDay : data.month < todayMonth ? 31 : 0;
		return data.fixedDefs.filter((d) => !data.recordedFixedIds.includes(d.id) && d.day <= dueDay);
	});

	const dayTotals = $derived({
		spend: data.selectedEntries.filter((e) => e.kind === 'spend').reduce((s, e) => s + e.amount, 0),
		income: data.selectedEntries
			.filter((e) => e.kind === 'income')
			.reduce((s, e) => s + e.amount, 0),
		save: data.selectedEntries.filter((e) => e.kind === 'save').reduce((s, e) => s + e.amount, 0)
	});

	const msgOf = (where: string) =>
		form?.where === where && 'message' in form && typeof form.message === 'string'
			? form.message
			: null;
	const addMsg = $derived(msgOf('add'));
	const updateMsg = $derived(msgOf('update'));

	/* ---------------- 동작 ---------------- */
	/** 폼 액션 주소 — JS 없이 제출돼도 보던 달·날짜가 유지되도록 쿼리를 함께 둔다 */
	const act = (name: string) => `?/${name}&m=${data.month}&d=${data.selectedDay}`;

	const afterAdd: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') {
				amtInput = '';
memoInput = '';
formInstallments = '1';
				addedFlash = true;
				setTimeout(() => (addedFlash = false), 2200);
				amountEl?.focus();
			}
		};
	};

	const afterUpdate: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') editBuf = null;
		};
	};

	function setKind(k: Kind) {
		formKind = k;
		formMethodId = k === 'income' || k === 'save' ? defaultAccountId : '';
		formGoalId = k === 'save' ? formGoalId || String(data.savingsGoals[0]?.id ?? '') : '';
	}

	function startEdit(e: Entry) {
		editBuf = {
			id: e.id,
			kind: e.kind,
			amount: String(e.amount),
			category: e.category,
			memo: e.memo,
			methodId: e.methodId === null ? '' : String(e.methodId),
			goalId: e.goalId === null ? '' : String(e.goalId),
			installments: String(e.installments ?? 1)
		};
	}

	function setEditKind(k: Kind) {
		if (!editBuf) return;
		editBuf.kind = k;
		editBuf.category = normalizeCategory(k, editBuf.category);
		if (k === 'income' || k === 'save') {
			if (!accounts.some((a) => String(a.id) === editBuf!.methodId)) editBuf.methodId = defaultAccountId;
		}
		editBuf.goalId = k === 'save' ? editBuf.goalId || String(data.savingsGoals[0]?.id ?? '') : '';
	}

	/** 날짜 패널의 '카드대금 결제' 열기 */
	const modes = $derived.by(() => {
		const list: ['entry' | 'pay' | 'transfer', string][] = [['entry', '내역 기록']];
		if (data.cardDebts.length > 0 && accounts.length > 0) list.push(['pay', '카드대금 결제']);
		if (accounts.length >= 2) list.push(['transfer', '송금']);
		return list;
	});

	function setMode(m: 'entry' | 'pay' | 'transfer') {
		if (m === 'pay') openPayMode();
		else if (m === 'transfer') openTransferMode();
		else mode = 'entry';
	}

	function openTransferMode() {
		mode = 'transfer';
		trFrom = String(accounts[0]?.id ?? '');
		trTo = String(accounts[1]?.id ?? '');
		trAmount = '';
	}

	function openPayMode() {
		mode = 'pay';
		const first = data.cardDebts[0];
		payCardSel = String(first?.id ?? '');
		payAmount = first ? num(first.bill.due > 0 ? first.bill.due : Math.max(0, first.owed)) : '';
		payAccountId = String(data.accountBalances[0]?.id ?? '');
	}

	function pickPayCard(id: string) {
		payCardSel = id;
		const c = data.cardDebts.find((d) => String(d.id) === id);
		payAmount = c ? num(c.bill.due > 0 ? c.bill.due : Math.max(0, c.owed)) : '';
	}

	const accountTotal = $derived(data.accountBalances.reduce((sum, a) => sum + a.current, 0));
	const planMonth = $derived(
		data.cardDebts.filter((c) => c.bill.due > 0).map((c) => c.bill.month).sort()[0] ?? null
	);
	/** 가장 먼저 돌아오는 결제 달의 카드대금 합계 */
	const dueTotal = $derived(
		data.cardDebts.filter((c) => c.bill.month === planMonth).reduce((sum, c) => sum + c.bill.due, 0)
	);

	const cardMethods = $derived(data.paymentMethods.filter((m) => m.kind === 'card'));
	const isCard = (id: string) => cardMethods.some((m) => String(m.id) === id);
	const INSTALLMENTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24, 36];
	const monthlyOf = (amount: string, n: string) => {
		const total = Number(amount.replace(/[^\d]/g, ''));
		return total > 0 && Number(n) > 1 ? Math.round(total / Number(n)) : 0;
	};
	const dayTransfers = $derived(data.transfers.filter((t) => t.date === data.selectedDate));

	const dayPayments = $derived(data.cardPayments.filter((p) => p.date === data.selectedDate));

	/** 숫자만 남기고 천 단위 쉼표를 붙인다 */
	const money = (raw: string) => {
		const digits = raw.replace(/[^\d]/g, '');
		return digits ? num(Number(digits)) : '';
	};
</script>

<svelte:head>
	<title>달통장 — {data.monthLabel}</title>
	<meta name="description" content="달력으로 기록하는 한 달 가계부" />
</svelte:head>

{#snippet kindTabs(current: Kind, pick: (k: Kind) => void, small: boolean, off: boolean)}
	<div
		class="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1"
		role="group"
		aria-label="지출·입금·저축"
	>
		{#each KINDS as k (k.kind)}
			<button
				type="button"
				disabled={off}
				aria-pressed={current === k.kind}
				onclick={() => pick(k.kind)}
				class="rounded-lg font-bold transition-colors disabled:opacity-40 {small
					? 'py-1 text-[12px]'
					: 'py-1.5 text-[13px]'} {current === k.kind
					? 'bg-surface text-ink shadow-sm'
					: 'text-mute hover:text-ink'}"
			>
				{k.label}
			</button>
		{/each}
	</div>
{/snippet}

<div class="space-y-4 pt-1">
	<!-- ── 요약 ─────────────────────────────────── -->
	<section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="이번 달 요약">
		<!-- 남은 돈 -->
		<div class="card col-span-2 p-5 lg:row-span-2">
			<h2 class="eyebrow">남은 돈</h2>
			{#if gauge}
				<p class="mt-1 flex items-baseline gap-1.5">
					<span
						class="font-num text-[38px] leading-none font-semibold tracking-tight tabular-nums {gauge.low
							? 'text-danger'
							: ''}"
					>
						{num(gauge.balance)}
					</span>
					<span class="text-[14px] text-mute">원</span>
				</p>
				<div
					class="mt-3 h-2 overflow-hidden rounded-full bg-surface-2 {gauge.pct === null ? 'hidden' : ''}"
					role="img"
					aria-label="월초 금액의 {Math.round(gauge.pct ?? 0)}% 남음"
				>
					<div
						class="h-full rounded-full transition-[width] duration-500 {gauge.low
							? 'bg-danger'
							: 'bg-brand'}"
						style="width: {gauge.pct ?? 0}%"
					></div>
				</div>
				<p class="tnum mt-2 text-[12px] text-mute">
					{#if gauge.pct !== null}{Math.round(gauge.pct)}% 남음 · {/if}월초 {num(gauge.start)}원 · 이번 달 {signed(
						gauge.balance - gauge.start
					)}원
				</p>
				{#if dueTotal > 0 && data.accountBalances.length > 0}
					<p
						class="tnum mt-2 rounded-lg px-3 py-2 text-[12px] {accountTotal - dueTotal < 0
							? 'bg-danger-soft text-danger'
							: 'bg-surface-2 text-mute'}"
					>
						이번 카드대금 <b class="font-num text-ink">{num(dueTotal)}원</b>을 결제하면 통장에
						<b class="font-num {accountTotal - dueTotal < 0 ? '' : 'text-ink'}"
							>{num(accountTotal - dueTotal)}원</b
						> 남아요
					</p>
				{/if}
				{#if pace}
					<div class="mt-3 rounded-xl bg-surface-2 px-3 py-2.5 text-[12.5px]">
						{#if pace.available < 0}
							<p class="tnum font-semibold text-danger">
								남은 돈보다 나갈 돈이 {num(-pace.available)}원 많아요
							</p>
						{:else}
							<p class="tnum">
								<span class="text-mute">하루</span>
								<span class="font-num text-[15px] font-bold">{num(Math.max(0, pace.daily))}원</span>
								<span class="text-mute"> · 이번 주 남은 {pace.weekDaysLeft}일 동안</span>
								<span class="font-num text-[15px] font-bold"
									>{num(Math.max(0, pace.daily) * pace.weekDaysLeft)}원</span
								>
							</p>
						{/if}
						<p class="tnum mt-0.5 text-[11.5px] text-mute">
							남은 {pace.remainingDays}일(오늘 포함)
							{#if pace.unrecordedFixed > 0}
								· 아직 기록하지 않은 고정지출 {num(pace.unrecordedFixed)}원 반영
							{/if}
						</p>
					</div>
				{/if}
			{:else}
				<p class="mt-1 font-num text-[30px] leading-none font-semibold text-faint">—</p>
				<p class="mt-2 max-w-sm text-[13px] leading-relaxed text-mute">
					{#if data.accountBalances.length === 0}
						등록된 통장이 없어요. 관리에서 통장을 추가한 뒤 통장별 잔액을 기록해 주세요.
					{:else}
						통장마다 지금 얼마 있는지 한 번만 기록하면, 다음 달부터는 자동으로 이어져요.
					{/if}
				</p>
				{#if data.accountBalances.length > 0}
					<div class="mt-3">
						<a class="btn btn-sm btn-brand" href={resolve(`/wallet?m=${data.month}&edit=1`)}>통장 잔액 기록</a>
					</div>
				{/if}
			{/if}
		</div>

		<!-- 입금 -->
		<div class="card flex flex-col justify-center p-4">
			<h3 class="eyebrow flex items-center gap-1.5">
				<span class="h-2 w-2 rounded-full bg-income"></span> 입금
			</h3>
			<p class="mt-2 font-num text-[22px] leading-none font-semibold text-income tabular-nums">
				+{num(data.incomeTotal)}
			</p>
		</div>

		<!-- 지출 -->
		<div class="card flex flex-col justify-center p-4">
			<h3 class="eyebrow flex items-center gap-1.5">
				<span class="h-2 w-2 rounded-full bg-ink"></span> 지출
			</h3>
			<p class="mt-2 font-num text-[22px] leading-none font-semibold tabular-nums">
				-{num(data.spendTotal)}
			</p>
			<p class="tnum mt-1.5 text-[11.5px] text-mute">
				{#if data.fixedTotal > 0}고정 {num(data.fixedTotal)}원 포함{:else}고정지출 없음{/if}
			</p>
			{#if spendDelta !== null}
				<p
					class="tnum mt-0.5 text-[11.5px] font-semibold {spendDelta > 0
						? 'text-danger'
						: spendDelta < 0
							? 'text-income'
							: 'text-mute'}"
				>
					지난달 같은 기간보다 {spendDelta === 0
						? '같아요'
						: `${num(Math.abs(spendDelta))}원 ${spendDelta > 0 ? '많아요' : '적어요'}`}
				</p>
			{/if}
		</div>

		<!-- 저축 -->
		<div class="card col-span-2 flex items-center gap-4 p-4">
			<span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-save-soft text-save">
				<Icon name="target" size={20} />
			</span>
			<div class="min-w-0 flex-1">
				<SaveProgress saved={data.saveTotal} plan={data.monthSavePlan} />
			</div>
		</div>

		<!-- 고정지출 -->
		<div class="card col-span-2 flex items-center gap-4 p-4 lg:col-span-4">
			<span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
				<Icon name="repeat" size={20} />
			</span>
			<div class="min-w-0 flex-1">
				{#if pendingFixed.length > 0}
					<p class="text-[13px] font-semibold">기록하지 않은 고정지출 {pendingFixed.length}건</p>
					<p class="truncate text-[12px] text-mute">{pendingFixed.map((d) => d.name).join(', ')}</p>
				{:else}
					<p class="text-[13px] font-semibold">고정지출 {data.fixedDefs.length}건</p>
					<p class="text-[12px] text-mute">
						{data.fixedDefs.length === 0
							? '관리 화면에서 매달 나가는 돈을 등록해 보세요.'
							: '지정일이 지난 항목은 모두 기록했어요.'}
					</p>
				{/if}
			</div>
			{#if pendingFixed.length > 0}
				<form method="POST" action={act('recordAllFixed')} use:enhance>
					<input type="hidden" name="month" value={data.month} />
					<button class="btn btn-sm btn-brand shrink-0">
						<Icon name="check" size={13} /> 한 번에 기록
					</button>
				</form>
			{/if}
		</div>
	</section>

<div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_344px]">
		<div class="min-w-0 space-y-4">
		<!-- ── 달력 ──────────────────────────────── -->
		<section class="card flex flex-col p-3 sm:p-4" aria-label="{data.monthLabel} 달력">
			<!-- 이번 달 한눈에 -->
			{#if elapsedDays > 0}
				<div class="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
					<div class="rounded-xl bg-surface-2 px-3 py-2">
						<p class="text-[11px] font-semibold text-mute">하루 평균 지출</p>
						<p class="tnum font-num text-[15px] font-semibold">{num(dailyAvg)}원</p>
					</div>
					<div class="rounded-xl bg-surface-2 px-3 py-2">
						<p class="text-[11px] font-semibold text-mute">
							{data.todayInMonth ? '이번 주 지출' : '지출이 가장 많은 주'}
						</p>
						<p class="tnum font-num text-[15px] font-semibold">{num(weekFocus)}원</p>
					</div>
					<div class="rounded-xl bg-income-soft px-3 py-2">
						<p class="text-[11px] font-semibold text-income">무지출 날</p>
						<p class="tnum font-num text-[15px] font-semibold">
							{noSpendDays}일 <span class="text-[11px] font-normal text-mute">/ {elapsedDays}일</span>
						</p>
					</div>
					<div class="rounded-xl bg-brand-soft px-3 py-2">
						<p class="text-[11px] font-semibold text-brand">가장 많이 쓴 날</p>
						<p class="tnum truncate font-num text-[15px] font-semibold">
							{#if topDay && topDay.spend > 0}
								{md(topDay.date)} · {compact(topDay.spend)}
							{:else}
								—
							{/if}
						</p>
					</div>
				</div>
			{/if}

			<div class="grid grid-cols-7 gap-1.5 pb-2 sm:grid-cols-[repeat(7,minmax(0,1fr))_86px]" aria-hidden="true">
				{#each WEEKDAYS as w, i (w)}
					<span
						class="text-center text-[11.5px] font-semibold {i === 0
							? 'text-danger/80'
							: i === 6
								? 'text-brand/80'
								: 'text-mute'}"
					>
						{w}
					</span>
				{/each}
				<span class="hidden text-center text-[11.5px] font-semibold text-mute sm:block">주간 합계</span>
			</div>

			<div
				class="grid flex-1 auto-rows-fr grid-cols-7 gap-1.5 sm:grid-cols-[repeat(7,minmax(0,1fr))_86px]"
				role="grid"
			>
				{#each weeks as row, ri (ri)}
					{@const wk = weekSum(row)}
					{#each row as cell, ci (cell ? cell.date : `empty-${ri}-${ci}`)}
						{#if cell}
							{@const selected = cell.day === data.selectedDay}
							{@const isToday = cell.date === data.today}
							{@const future = cell.date > data.today}
							{@const shown = [...cell.entries].sort((a, b) => b.amount - a.amount).slice(0, 2)}
							{@const plans = plannedByDate.get(cell.date) ?? []}
							{@const heat = !future && cell.spend > 0 ? Math.round((cell.spend / maxDaySpend) * 24) + 4 : 0}
							<a
								href={resolve(`/?m=${data.month}&d=${cell.day}`)}
								data-sveltekit-noscroll
								aria-label="{dayLabel(cell.date)} {weekdayOf(cell.date)}요일{cell.spend > 0
									? `, 지출 ${num(cell.spend)}원`
									: ''}{cell.income > 0 ? `, 입금 ${num(cell.income)}원` : ''}{cell.save > 0
									? `, 저축 ${num(cell.save)}원`
									: ''}{plans.length > 0
									? `, 예정: ${plans.map((p) => `${p.label} ${num(p.amount)}원`).join(', ')}`
									: ''}{cell.alerts.length > 0
									? `, 예산 경고: ${cell.alerts.map((a) => `${a.category} ${a.level === 'over' ? '초과' : '80% 도달'}`).join(', ')}`
									: ''}"
								aria-current={isToday ? 'date' : undefined}
								class="flex min-h-[76px] min-w-0 flex-col rounded-xl p-1 transition-colors sm:min-h-[92px] sm:p-1.5 2xl:min-h-[132px] {selected
									? 'ring-2 ring-brand'
									: future
										? 'ring-1 ring-line ring-inset hover:bg-surface-2'
										: 'hover:ring-1 hover:ring-line-strong'}"
								style="background: {future
									? 'transparent'
									: `color-mix(in srgb, var(--color-brand) ${heat}%, var(--color-surface-2))`}"
							>
								<span class="flex items-center justify-between gap-1">
									<span
										class="grid h-5 min-w-5 place-items-center rounded-full px-1 font-num text-[12px] font-semibold tabular-nums {isToday
											? 'bg-brand text-white'
											: future
												? 'text-faint'
												: 'text-ink'}"
									>
										{cell.day}
									</span>
									<span class="flex items-center gap-1">
										{#if cell.fixed > 0}
											<span
												class="h-1.5 w-1.5 rounded-[2px] border border-ink/60"
												title="고정지출"
												aria-hidden="true"
											></span>
										{/if}
										{#if plans.length > 0}
											<span class="h-1.5 w-1.5 rounded-full bg-save" title="예정" aria-hidden="true"></span>
										{/if}
										{#if cell.alerts.length > 0}
											<span
												class="grid h-4 min-w-4 place-items-center rounded-full text-[10px] leading-none font-bold {cell.alerts.some(
													(a) => a.level === 'over'
												)
													? 'bg-danger text-white'
													: 'bg-brand-soft text-brand'}"
												title={cell.alerts
													.map(
														(a) => `${a.category} 예산 ${a.level === 'over' ? '초과' : '80% 도달'}`
													)
													.join(', ')}>!</span
											>
										{/if}
									</span>
								</span>

								<!-- 아주 넓은 화면: 큰 금액 두 건 + 예정 -->
								<span class="mt-1 hidden min-w-0 flex-col gap-[3px] 2xl:flex">
									{#each shown as e (e.id)}
										<span
											class="flex min-w-0 items-center justify-between gap-1 rounded-[5px] border-l-[3px] bg-surface/70 py-[2px] pr-1 pl-1 text-[11px] leading-tight"
											style="border-color: {colorOf(e)}"
										>
											<span class="min-w-0 truncate font-medium">{e.memo || e.category}</span>
											<span
												class="shrink-0 font-num tabular-nums {e.kind === 'income'
													? 'text-income'
													: e.kind === 'save'
														? 'text-save'
														: ''}"
											>
												{e.kind === 'spend' ? '-' : e.kind === 'income' ? '+' : ''}{compact(
													e.amount
												)}
											</span>
										</span>
									{/each}
									{#if cell.entries.length > 2}
										<span class="px-1 text-[10.5px] text-mute">외 {cell.entries.length - 2}건</span>
									{/if}
									{#each plans.slice(0, 2) as p, pi (pi)}
										<span
											class="flex min-w-0 items-center justify-between gap-1 rounded-[5px] border border-dashed border-save/50 px-1 py-[1px] text-[10.5px] leading-tight text-save"
										>
											<span class="min-w-0 truncate">{p.kind === 'card' ? '결제' : '예정'} · {p.label}</span>
											<span class="shrink-0 font-num tabular-nums">{compact(p.amount)}</span>
										</span>
									{/each}
								</span>

								<!-- 그날 합계 -->
								<span class="mt-auto pt-1 text-right font-num leading-tight tabular-nums">
									{#if cell.spend > 0}
										<span class="block truncate text-[10.5px] font-bold sm:text-[13px]"
											>-{compact(cell.spend)}</span
										>
									{/if}
									{#if cell.income > 0}
										<span class="block truncate text-[9.5px] font-semibold text-income sm:text-[11px]"
											>+{compact(cell.income)}</span
										>
									{/if}
									{#if cell.save > 0}
										<span class="block truncate text-[9.5px] text-save sm:text-[11px]">저축 {compact(cell.save)}</span>
									{/if}
									{#if !future && cell.spend === 0}
										<span class="block text-[9.5px] font-semibold text-income sm:text-[10.5px]">무지출</span>
									{/if}
								</span>
								{#if cell.entries.length > 0}
									<span class="mt-0.5 flex items-center justify-end gap-[3px] 2xl:hidden" aria-hidden="true">
										{#each dots(cell) as c, i (i)}
											<span class="h-1.5 w-1.5 rounded-full" style="background: {c}"></span>
										{/each}
									</span>
								{/if}
							</a>
						{:else}
							<div aria-hidden="true"></div>
						{/if}
					{/each}
					<!-- 주간 합계 (넓은 화면) -->
					<div
						class="hidden flex-col justify-center gap-0.5 rounded-xl border border-line bg-surface px-2 py-1.5 text-right font-num tabular-nums sm:flex"
					>
						<span class="text-[10.5px] font-semibold text-mute">{ri + 1}주</span>
						<span class="text-[13px] font-bold">{wk.spend > 0 ? `-${compact(wk.spend)}` : '0'}</span>
						{#if wk.income > 0}<span class="text-[11px] text-income">+{compact(wk.income)}</span>{/if}
						{#if wk.noSpend > 0}<span class="text-[10.5px] text-income">무지출 {wk.noSpend}일</span>{/if}
					</div>
				{/each}
			</div>

			<p class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11.5px] text-mute">
				<span class="flex items-center gap-1.5">
					<span
						class="h-3 w-5 rounded"
						style="background: linear-gradient(90deg, var(--color-surface-2), color-mix(in srgb, var(--color-brand) 28%, var(--color-surface-2)))"
					></span>
					많이 쓴 날일수록 진해요
				</span>
				<span class="flex items-center gap-1.5">
					<span class="h-1.5 w-1.5 rounded-[2px] border border-ink/60"></span> 고정지출
				</span>
				<span class="flex items-center gap-1.5">
					<span class="h-1.5 w-1.5 rounded-full bg-save"></span> 예정(고정지출·카드 결제)
				</span>
				<span class="flex items-center gap-1.5">
					<span
						class="grid h-4 w-4 place-items-center rounded-full bg-brand-soft text-[10px] font-bold text-brand"
						>!</span
					>
					예산 80% · <span class="text-danger">초과</span>
				</span>
			</p>
		</section>

		</div>

		<!-- ── 선택한 날 ─────────────────────────── -->
		<aside
			bind:this={panelEl}
			class="card scroll-mt-16 overflow-hidden"
			aria-label="선택한 날의 기록"
		>
			<header class="flex items-start justify-between gap-2 border-b border-line px-4 py-3.5">
				<div>
					<h2 class="card-title">
						{dayLabel(data.selectedDate)}
						<span class="ml-0.5 text-[13px] font-medium text-mute"
							>{weekdayOf(data.selectedDate)}요일</span
						>
					</h2>
					<p class="tnum mt-0.5 text-[12px] text-mute">
						{#if dayTotals.spend + dayTotals.income + dayTotals.save === 0}
							기록 없음
						{:else}
							{#if dayTotals.income > 0}<span class="text-income">+{num(dayTotals.income)}</span
								>{/if}
							{#if dayTotals.spend > 0}<span>-{num(dayTotals.spend)}</span>{/if}
							{#if dayTotals.save > 0}<span class="text-save">저축 {num(dayTotals.save)}</span>{/if}
						{/if}
					</p>
				</div>
				{#if selectedIsToday}
					<span class="pill bg-brand-soft text-brand">오늘</span>
				{:else if selectedIsFuture}
					<span class="pill bg-surface-2 text-mute">앞으로 올 날</span>
				{/if}
			</header>

			<!-- 입력 -->
			{#if selectedIsFuture}
				<p class="border-b border-line px-4 py-4 text-[12.5px] leading-relaxed text-mute">
					오늘까지의 날짜에만 기록할 수 있어요.
				</p>
				{:else}
{#if modes.length > 1}
	<div
		class="grid gap-1 border-b border-line bg-surface-2 p-1.5"
		style="grid-template-columns: repeat({modes.length}, minmax(0, 1fr))"
		role="group"
		aria-label="기록 종류"
	>
		{#each modes as [key, label] (key)}
			<button
				type="button"
				aria-pressed={mode === key}
				onclick={() => setMode(key)}
				class="rounded-lg py-1.5 text-[13px] font-bold transition-colors {mode === key
					? 'bg-surface text-ink shadow-sm'
					: 'text-mute hover:text-ink'}"
			>
				{label}
			</button>
		{/each}
	</div>
{/if}
					{#if mode === 'pay' && data.cardDebts.length > 0 && data.accountBalances.length > 0}
						<form
							method="POST"
							action={act('payCard')}
							use:enhance={() => {
								return async ({ result, update }) => {
									await update({ reset: false });
									if (result.type === 'success') {
										mode = 'entry';
										addedFlash = true;
										setTimeout(() => (addedFlash = false), 2200);
									}
								};
							}}
							class="space-y-3 border-b border-line p-4"
						>
							<input type="hidden" name="date" value={data.selectedDate} />
							<label class="block">
								<span class="eyebrow mb-1 block">어느 카드의 대금을 결제하나요?</span>
								<select
									name="cardId"
									value={payCardSel}
									onchange={(e) => pickPayCard(e.currentTarget.value)}
									class="input"
								>
									{#each data.cardDebts as c (c.id)}
										<option value={String(c.id)}>{c.name} · 이번 결제 {num(c.bill.due)}원</option>
									{/each}
								</select>
							</label>
							<label class="block">
								<span class="eyebrow mb-1 block">어느 통장에서 내나요?</span>
								<select name="accountId" bind:value={payAccountId} class="input">
									{#each data.accountBalances as a (a.id)}
										<option value={String(a.id)}>
											{a.name} · {num(a.current)}원
										</option>
									{/each}
								</select>
							</label>
							<label
								class="flex items-baseline gap-1.5 rounded-xl border border-line-strong px-3 py-2 transition focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/15"
							>
								<span class="sr-only">결제 금액</span>
								<input
									name="amount"
									bind:value={payAmount}
									oninput={() => (payAmount = money(payAmount))}
									inputmode="numeric"
									autocomplete="off"
									placeholder="0"
									class="min-w-0 flex-1 bg-transparent font-num text-[28px] font-semibold tabular-nums outline-none placeholder:text-faint"
								/>
								<span class="text-[14px] text-mute">원</span>
							</label>
							<div class="flex items-center justify-end gap-2">
								{#if msgOf('payCard')}
									<span class="mr-auto text-[12.5px] font-medium text-danger">{msgOf('payCard')}</span>
								{/if}
								<button type="button" class="btn-ghost" onclick={() => (mode = 'entry')}>취소</button>
								<button class="btn shrink-0">결제</button>
							</div>
						</form>
					{:else if mode === 'transfer' && accounts.length >= 2}
							<form
								method="POST"
								action={act('transfer')}
								use:enhance={() => {
									return async ({ result, update }) => {
										await update({ reset: false });
										if (result.type === 'success') {
											mode = 'entry';
											addedFlash = true;
											setTimeout(() => (addedFlash = false), 2200);
										}
									};
								}}
								class="space-y-3 border-b border-line p-4"
							>
								<input type="hidden" name="date" value={data.selectedDate} />
								<label class="block">
									<span class="eyebrow mb-1 block">보내는 통장</span>
									<select name="fromId" bind:value={trFrom} class="input">
										{#each accounts as a (a.id)}
											<option value={String(a.id)}>
												{a.name} · {num(data.accountBalances.find((b) => b.id === a.id)?.current ?? 0)}원
											</option>
										{/each}
									</select>
								</label>
								<label class="block">
									<span class="eyebrow mb-1 block">받는 통장</span>
									<select name="toId" bind:value={trTo} class="input">
										{#each accounts as a (a.id)}
											<option value={String(a.id)} disabled={String(a.id) === trFrom}>
												{a.name} · {num(data.accountBalances.find((b) => b.id === a.id)?.current ?? 0)}원
											</option>
										{/each}
									</select>
								</label>
								<label
									class="flex items-baseline gap-1.5 rounded-xl border border-line-strong px-3 py-2 transition focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/15"
								>
									<span class="sr-only">송금 금액</span>
									<input
										name="amount"
										bind:value={trAmount}
										oninput={() => (trAmount = money(trAmount))}
										inputmode="numeric"
										autocomplete="off"
										placeholder="0"
										class="min-w-0 flex-1 bg-transparent font-num text-[28px] font-semibold tabular-nums outline-none placeholder:text-faint"
									/>
									<span class="text-[14px] text-mute">원</span>
								</label>
								<div class="flex items-center justify-end gap-2">
									{#if msgOf('transfer')}
										<span class="mr-auto text-[12.5px] font-medium text-danger">{msgOf('transfer')}</span>
									{/if}
									<button type="button" class="btn-ghost" onclick={() => (mode = 'entry')}>취소</button>
									<button class="btn shrink-0">송금</button>
								</div>
							</form>
						{:else}
						<form
							method="POST"
							action={act('add')}
					use:enhance={afterAdd}
					class="space-y-3 border-b border-line p-4"
				>
					<input type="hidden" name="date" value={data.selectedDate} />
					<input type="hidden" name="kind" value={formKind} />
					<input type="hidden" name="category" value={formCategory} />

					{@render kindTabs(formKind, setKind, false, false)}

					<label
						class="flex items-baseline gap-1.5 rounded-xl border border-line-strong px-3 py-2 transition focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/15"
					>
						<span class="sr-only">금액</span>
						<input
							bind:this={amountEl}
							name="amount"
							value={amtInput}
							oninput={(e) => {
								amtInput = money(e.currentTarget.value);
								e.currentTarget.value = amtInput;
							}}
							inputmode="numeric"
							autocomplete="off"
							placeholder="0"
							class="min-w-0 flex-1 bg-transparent font-num text-[28px] font-semibold tabular-nums outline-none placeholder:text-faint"
						/>
						<span class="text-[14px] text-mute">원</span>
					</label>

					{#if formKind !== 'save'}
						<div class="flex flex-wrap gap-1.5" role="group" aria-label="분류">
							{#each catList(formKind) as c (c.name)}
								<button
									type="button"
									class="chip"
									aria-pressed={formCategory === c.name}
									onclick={() => (pickedCategory = c.name)}
								>
									<span class="h-2 w-2 rounded-full" style="background: {c.color}"></span>
									{c.name}
									{#if formKind === 'spend' && budgetBy[c.name] && budgetBy[c.name].level !== 'ok'}
										<span
											class="rounded-full px-1.5 text-[10.5px] font-bold {budgetBy[c.name].level ===
											'over'
												? 'bg-danger text-white'
												: 'bg-brand-soft text-brand'}"
											title="예산 {budgetBy[c.name].pct}% 사용"
										>
											{budgetBy[c.name].level === 'over' ? '초과' : `${budgetBy[c.name].pct}%`}
										</span>
									{/if}
								</button>
							{/each}
						</div>
						{#if selectedBudget}
							<p
								class="tnum rounded-lg px-3 py-2 text-[12px] {selectedBudget.level === 'over'
									? 'bg-danger-soft text-danger'
									: selectedBudget.level === 'warn'
										? 'bg-brand-soft text-brand'
										: 'bg-surface-2 text-mute'}"
							>
								{selectedBudget.name} 예산 {num(selectedBudget.budget)}원 중 {selectedBudget.pct}%
								사용 ·
								{selectedBudget.level === 'over'
									? `${num(selectedBudget.spent - selectedBudget.budget)}원 초과`
									: `${num(selectedBudget.budget - selectedBudget.spent)}원 남음`}
							</p>
						{/if}
					{/if}

					{#if formKind === 'spend'}
						<select name="methodId" bind:value={formMethodId} class="input" aria-label="결제수단">
							<option value="">결제수단 선택 안 함</option>
							{#if cardMethods.length > 0}
								<optgroup label="카드">
									{#each cardMethods as m (m.id)}<option value={String(m.id)}>{m.name}</option>{/each}
								</optgroup>
							{/if}
							{#if accounts.length > 0}
								<optgroup label="통장">
									{#each accounts as m (m.id)}<option value={String(m.id)}>{m.name}</option>{/each}
								</optgroup>
							{/if}
						</select>
						{#if isCard(formMethodId)}
							<label class="flex items-center gap-2">
								<span class="eyebrow shrink-0">할부</span>
								<select name="installments" bind:value={formInstallments} class="input">
									{#each INSTALLMENTS as n (n)}
										<option value={String(n)}>{n === 1 ? '일시불' : `${n}개월 할부`}</option>
									{/each}
								</select>
							</label>
							{#if monthlyOf(amtInput, formInstallments) > 0}
								<p class="tnum -mt-1 rounded-lg bg-surface-2 px-3 py-2 text-[12px] text-mute">
									한 달에 약 {num(monthlyOf(amtInput, formInstallments))}원씩 {formInstallments}개월 동안
									결제돼요. 지출은 전체 금액으로 기록돼요.
								</p>
							{/if}
						{/if}
					{:else if formKind === 'income'}
							{#if accounts.length === 0}
								<p class="msg-error">관리 화면에서 통장을 먼저 등록하면 입금될 통장을 고를 수 있어요.</p>
							{:else}
								<label class="block">
									<span class="eyebrow mb-1 block">어느 통장으로 들어왔나요?</span>
									<select name="methodId" bind:value={formMethodId} class="input" required>
										{#each accounts as a (a.id)}
											<option value={String(a.id)}>{a.name}</option>
										{/each}
									</select>
								</label>
							{/if}
						{:else if formKind === 'save'}
						{#if data.savingsGoals.length === 0}
							<p class="msg-error">
								저축은 목표를 정해야 기록할 수 있어요. 관리 화면에서 저축 목표를 먼저 만들어 주세요.
							</p>
						{:else}
							{#if accounts.length > 0}
								<label class="block">
									<span class="eyebrow mb-1 block">어느 통장의 돈으로 저축했나요?</span>
									<select name="methodId" bind:value={formMethodId} class="input" required>
										{#each accounts as a (a.id)}
											<option value={String(a.id)}>
												{a.name} · {num(data.accountBalances.find((b) => b.id === a.id)?.current ?? 0)}원
											</option>
										{/each}
									</select>
								</label>
							{/if}
							<label class="block">
								<span class="eyebrow mb-1 block">어느 목표에 저축하나요?</span>
								<select name="goalId" bind:value={formGoalId} class="input" required>
									{#each data.savingsGoals as g (g.id)}
										<option value={String(g.id)}>{g.name}</option>
									{/each}
								</select>
							</label>
						{/if}
					{/if}

					<div class="flex items-center gap-2">
						<input
							name="memo"
							bind:value={memoInput}
							placeholder="메모 (선택)"
							autocomplete="off"
							class="input min-w-0 flex-1"
							aria-label="메모"
						/>
						<button class="btn shrink-0"><Icon name="plus" size={15} /> 기록</button>
					</div>

					<p role="status" class="min-h-[18px] text-[12.5px]">
						{#if addedFlash}
							<span class="inline-flex items-center gap-1 font-semibold text-income">
								<Icon name="check" size={13} /> 기록했어요
							</span>
						{:else if addMsg}
							<span class="font-medium text-danger">{addMsg}</span>
						{/if}
					</p>
					</form>
					{/if}
				{/if}

				<!-- 그날 내역 -->
				<div class="p-2">
					{#if updateMsg}<p class="msg-error m-2">{updateMsg}</p>{/if}
					{#if dayTransfers.length > 0}
						<ul class="mb-1">
							{#each dayTransfers as t (t.id)}
								<li class="flex items-center gap-3 rounded-xl px-3 py-2.5">
									<Icon name="refresh" size={16} />
									<div class="min-w-0 flex-1">
										<p class="truncate text-[14px] font-semibold">송금 · {t.fromName} → {t.toName}</p>
									</div>
									<span class="font-num text-[14px] font-semibold tabular-nums">{num(t.amount)}원</span>
									<form method="POST" action={act('deleteTransfer')} use:enhance>
										<input type="hidden" name="id" value={t.id} />
										<button class="iconbtn iconbtn-danger" aria-label="송금 기록 삭제"
											><Icon name="trash" size={14} /></button
										>
									</form>
								</li>
							{/each}
						</ul>
					{/if}
					{#if dayPayments.length > 0}
						<ul class="mb-1">
							{#each dayPayments as p (p.id)}
								<li class="flex items-center gap-3 rounded-xl px-3 py-2.5">
									<Icon name="wallet" size={16} />
									<div class="min-w-0 flex-1">
										<p class="truncate text-[14px] font-semibold">카드대금 · {p.cardName}</p>
										<p class="text-[12px] text-mute">{p.accountName}에서 이체</p>
									</div>
									<span class="font-num text-[14px] font-semibold tabular-nums">{num(p.amount)}원</span>
									<form method="POST" action={act('deleteCardPayment')} use:enhance>
										<input type="hidden" name="id" value={p.id} />
										<button class="iconbtn iconbtn-danger" aria-label="카드대금 결제 기록 삭제"
											><Icon name="trash" size={14} /></button
										>
									</form>
								</li>
							{/each}
						</ul>
					{/if}
				<ul>
					{#each data.selectedEntries as e (e.id)}
						<li class="rounded-xl">
							{#if editBuf && editBuf.id === e.id}
								<form
									method="POST"
									action={act('update')}
									use:enhance={afterUpdate}
									class="m-1 space-y-2.5 rounded-xl bg-surface-2 p-3"
								>
									<input type="hidden" name="id" value={e.id} />
									<input type="hidden" name="date" value={data.selectedDate} />
									<input type="hidden" name="kind" value={editBuf.kind} />
									{@render kindTabs(editBuf.kind, setEditKind, true, false)}
									<label class="flex items-baseline gap-1.5">
										<span class="sr-only">금액</span>
										<input
											name="amount"
											value={editBuf.amount}
											oninput={(ev) => {
												if (editBuf) editBuf.amount = money(ev.currentTarget.value);
												ev.currentTarget.value = editBuf?.amount ?? '';
											}}
											inputmode="numeric"
											class="input font-num tabular-nums"
										/>
										<span class="text-[13px] text-mute">원</span>
									</label>
									{#if editBuf.kind !== 'save'}
										<select
											name="category"
											bind:value={editBuf.category}
											class="input"
											aria-label="분류"
										>
											{#each catList(editBuf.kind) as c (c.name)}
												<option value={c.name}>{c.name}</option>
											{/each}
										</select>
									{:else}
										<input type="hidden" name="category" value="저축" />
									{/if}
									{#if editBuf.kind === 'spend'}
										<select
											name="methodId"
											bind:value={editBuf.methodId}
											class="input"
											aria-label="결제수단"
										>
											<option value="">결제수단 선택 안 함</option>
											{#if cardMethods.length > 0}
												<optgroup label="카드">
													{#each cardMethods as m (m.id)}<option value={String(m.id)}>{m.name}</option>{/each}
												</optgroup>
											{/if}
											{#if accounts.length > 0}
												<optgroup label="통장">
													{#each accounts as m (m.id)}<option value={String(m.id)}>{m.name}</option>{/each}
												</optgroup>
											{/if}
										</select>
										{#if isCard(editBuf.methodId)}
											<select name="installments" bind:value={editBuf.installments} class="input" aria-label="할부">
												{#each INSTALLMENTS as n (n)}
													<option value={String(n)}>{n === 1 ? '일시불' : `${n}개월 할부`}</option>
												{/each}
											</select>
										{/if}
									{:else if editBuf.kind === 'income' && accounts.length > 0}
										<select
											name="methodId"
											bind:value={editBuf.methodId}
											class="input"
											aria-label="입금된 통장"
										>
											<option value="" disabled>입금된 통장 선택</option>
											{#each accounts as a (a.id)}
												<option value={String(a.id)}>{a.name}</option>
											{/each}
										</select>
									{:else if editBuf.kind === 'save'}
										{#if accounts.length > 0}
											<select
												name="methodId"
												bind:value={editBuf.methodId}
												class="input"
												aria-label="저축한 통장"
											>
												<option value="" disabled>저축한 통장 선택</option>
												{#each accounts as a (a.id)}
													<option value={String(a.id)}>{a.name}</option>
												{/each}
											</select>
										{/if}
										<select
											name="goalId"
											bind:value={editBuf.goalId}
											class="input"
											aria-label="저축 목표"
											required
										>
											{#each data.savingsGoals as g (g.id)}
												<option value={String(g.id)}>{g.name}</option>
											{/each}
										</select>
									{/if}
									<input
										name="memo"
										bind:value={editBuf.memo}
										class="input"
										placeholder="메모"
										aria-label="메모"
									/>
									<div class="flex justify-end gap-1.5">
										<button type="button" class="btn-ghost" onclick={() => (editBuf = null)}
											>취소</button
										>
										<button class="btn btn-sm">저장</button>
									</div>
								</form>
							{:else}
								<div
									class="group flex items-center gap-3 rounded-xl px-2.5 py-2.5 hover:bg-surface-2/70"
								>
									<span
										class="h-8 w-1 shrink-0 rounded-full"
										style="background: {colorOf(e)}"
										aria-hidden="true"
									></span>
									<div class="min-w-0 flex-1">
										<p class="truncate text-[14px] leading-tight font-semibold">
											{e.memo || e.category}
										</p>
										<p class="mt-0.5 truncate text-[11.5px] text-mute">
											{e.category}{e.source.startsWith('fixed:') ? ' · 고정' : ''}{e.installments > 1
													? ` · ${e.installments}개월 할부`
													: ''}{e.goalName
												? ` · ${e.goalName}${e.methodName ? ` ← ${e.methodName}` : ''}`
												: e.methodName
													? ` · ${e.methodName}`
													: ''}
										</p>
									</div>
									<span
										class="font-num text-[14px] font-semibold tabular-nums {e.kind === 'income'
											? 'text-income'
											: e.kind === 'save'
												? 'text-save'
												: ''}"
									>
										{signed(e.kind === 'spend' ? -e.amount : e.amount)}
									</span>
									<div
										class="flex shrink-0 items-center opacity-100 transition-opacity xl:opacity-0 xl:group-focus-within:opacity-100 xl:group-hover:opacity-100"
									>
										<button class="iconbtn" aria-label="수정" onclick={() => startEdit(e)}>
											<Icon name="edit" size={14} />
										</button>
										<form method="POST" action={act('delete')} use:enhance>
											<input type="hidden" name="id" value={e.id} />
											<button class="iconbtn iconbtn-danger" aria-label="삭제">
												<Icon name="trash" size={14} />
											</button>
										</form>
									</div>
								</div>
							{/if}
						</li>
					{:else}
						<li class="px-3 py-6 text-center text-[13px] text-mute">
							{selectedIsFuture ? '아직 오지 않은 날이에요.' : '이 날의 기록이 아직 없어요.'}
						</li>
					{/each}
				</ul>
			</div>
		</aside>
	</div>

	<!-- ── 다가오는 일정 ──────────────────────── -->
	{#if upcoming.length > 0}
		<section class="card p-4 sm:p-5" aria-label="다가오는 일정">
			<header class="flex flex-wrap items-baseline justify-between gap-2">
				<h2 class="card-title flex items-center gap-2">
					<Icon name="clock" size={16} /> 다가오는 일정
				</h2>
				<p class="tnum text-[12px] text-mute">
					앞으로 30일 · 합계 <b class="font-num text-[14px] text-ink">{num(upcomingTotal)}원</b>
				</p>
			</header>
			<ol class="mt-3 grid gap-2 sm:grid-cols-2">
				{#each upcoming as u, i (i)}
					<li class="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
						<span
							class="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-center leading-none {u.kind === 'card'
								? 'bg-brand-soft text-brand'
								: 'bg-save-soft text-save'}"
						>
							<span>
								<span class="block font-num text-[15px] font-bold">{Number(u.date.slice(8))}</span>
								<span class="block text-[9.5px] font-semibold">{Number(u.date.slice(5, 7))}월</span>
							</span>
						</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-[13.5px] font-semibold">{u.label}</span>
							<span class="block text-[11.5px] text-mute">
								{u.kind === 'card' ? '카드대금 결제' : '고정지출'} · {u.dday === 0
									? '오늘'
									: `${u.dday}일 남음`}
							</span>
						</span>
						<span class="tnum font-num text-[14px] font-semibold">{num(u.amount)}원</span>
					</li>
				{/each}
			</ol>
		</section>
	{/if}
</div>
