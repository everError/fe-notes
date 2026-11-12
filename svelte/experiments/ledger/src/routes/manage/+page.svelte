<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { SubmitFunction } from '$app/forms';
	import type { PageProps } from './$types';
	import Icon from '#lib/components/Icon.svelte';
	import { COLOR_CHOICES } from '#lib/categories';
	import { cycleText, num } from '#lib/format';

	let { data, form }: PageProps = $props();

	const EXPORTS = [
		['entries', '내역 (지출·입금·저축)'],
		['payments', '카드대금 결제'],
		['transfers', '송금'],
		['adjustments', '카드 금액 조정'],
		['balances', '월초 잔액 기록']
	] as const;

	/** 열려 있는 입력 폼 — 'fixed' 같은 새로 만들기, 'fixed:3' 같은 수정 */
	let open = $state<string | null>(null);
	let catKind = $state<'spend' | 'income'>('spend');
	let confirmReset = $state(false);
	let newMethodKind = $state<'card' | 'account'>('card');
	let newCycle = $state('');
	let newPay = $state('');
	const cycleNum = (v: string) => {
		const n = Number(v);
		return Number.isInteger(n) && n >= 1 && n <= 28 ? n : 1;
	};
	const payNum = (v: string) => {
		const n = Number(v);
		return Number.isInteger(n) && n >= 1 && n <= 31 ? n : null;
	};

	/** 설정 화면은 탭으로 나눠 한 번에 한 가지만 보여 준다 */
	const TABS = [
		['fixed', '고정지출'],
		['categories', '분류·예산'],
		['methods', '카드·통장'],
		['goals', '저축 목표'],
		['data', '데이터']
	] as const;
	const tab = $derived(page.url.searchParams.get('tab') ?? 'fixed');

	const act = (name: string) => `?/${name}&m=${data.month}&tab=${tab}`;
	const todayMonth = $derived(data.today.slice(0, 7));
	const todayDay = $derived(Number(data.today.slice(8, 10)));
	const budgetOf = (name: string) => data.budgets.find((b) => b.name === name)?.budget ?? null;
	const spendCats = $derived(data.categories.filter((c) => c.kind === 'spend'));
	const shownCats = $derived(data.categories.filter((c) => c.kind === catKind));

	/** 섹션별 오류 메시지 */
	const msg = (...wheres: string[]) =>
		form &&
		wheres.includes(String(form.where)) &&
		'message' in form &&
		typeof form.message === 'string'
			? form.message
			: null;

	/** 성공하면 열려 있는 폼을 닫는다 */
	const closeOnSuccess: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update({ reset: result.type === 'success' });
			if (result.type === 'success') open = null;
		};
	};

	const methodsOf = (kind: 'card' | 'account') =>
		data.paymentMethods.filter((m) => m.kind === kind);

	const dueDay = $derived(data.todayInMonth ? todayDay : data.month < todayMonth ? 31 : 0);
	const fixedMonthly = $derived(data.fixedDefs.reduce((s, d) => s + d.amount, 0));

	const money = (e: Event & { currentTarget: HTMLInputElement }) => {
		const digits = e.currentTarget.value.replace(/[^\d]/g, '');
		e.currentTarget.value = digits ? num(Number(digits)) : '';
	};
</script>

<svelte:head>
	<title>{TABS.find(([k]) => k === tab)?.[1] ?? '설정'} — 달통장</title>
</svelte:head>

{#snippet colorPicker(selected: string)}
	<div class="flex flex-wrap gap-2" role="radiogroup" aria-label="색">
		{#each COLOR_CHOICES as c (c)}
			<label class="cursor-pointer">
				<input type="radio" name="color" value={c} checked={c === selected} class="peer sr-only" />
				<span
					class="block h-6 w-6 rounded-full ring-offset-2 transition peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-brand"
					style="background: {c}"
				></span>
			</label>
		{/each}
	</div>
{/snippet}

{#snippet naturePicker(selected: string)}
	<div class="flex items-center gap-2" role="radiogroup" aria-label="성격">
		<span class="eyebrow">성격</span>
		{#each [['consume', '소비'], ['bill', '공과금']] as const as [v, label] (v)}
			<label class="cursor-pointer">
				<input type="radio" name="nature" value={v} checked={v === selected} class="peer sr-only" />
				<span
					class="block rounded-lg bg-surface px-3 py-1 text-[12px] font-bold text-mute peer-checked:bg-ink peer-checked:text-surface peer-focus-visible:ring-2 peer-focus-visible:ring-brand"
					>{label}</span
				>
			</label>
		{/each}
	</div>
{/snippet}

<div class="space-y-4 pt-1 pb-4">
	<!-- 좁은 화면에서는 탭을 위에 둔다(넓은 화면은 좌측 메뉴) -->
	<nav class="flex flex-wrap gap-1.5 lg:hidden" aria-label="설정 메뉴">
		{#each TABS as [key, label] (key)}
			<a class="chip" href={resolve(`/manage?tab=${key}`)} aria-current={tab === key ? 'page' : undefined}
				>{label}</a
			>
		{/each}
	</nav>
	<!-- ── 고정지출 ──────────────────────────────── -->
	{#if tab === 'fixed'}
	<section class="card p-4 sm:p-5" aria-label="고정지출">
		<header class="flex flex-wrap items-center justify-between gap-2">
			<div>
				<h2 class="card-title">고정지출</h2>
				<p class="tnum mt-0.5 text-[12px] text-mute">
					매달 {num(fixedMonthly)}원 · {data.monthLabel} 기준 기록 상태
				</p>
			</div>
			<button class="btn-ghost" onclick={() => (open = open === 'fixed' ? null : 'fixed')}>
				<Icon name="plus" size={13} /> 추가
			</button>
		</header>

		{#if msg('recordFixed', 'deleteFixed')}<p class="msg-error mt-3">
				{msg('recordFixed', 'deleteFixed')}
			</p>{/if}

		{#snippet fixedFields(v: {
			name: string;
			day: number | string;
			amount: number | string;
			category: string;
			methodId: string;
		})}
			<div
				class="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1.4fr)_84px_minmax(0,1fr)_minmax(0,1fr)]"
			>
				<input
					name="name"
					value={v.name}
					placeholder="이름 (예: 월세)"
					class="input col-span-2 sm:col-span-1"
					aria-label="이름"
				/>
				<input
					name="day"
					value={v.day}
					inputmode="numeric"
					placeholder="지정일"
					class="input font-num tabular-nums"
					aria-label="매달 지정일"
				/>
				<input
					name="amount"
					value={v.amount}
					oninput={money}
					inputmode="numeric"
					placeholder="금액"
					class="input font-num tabular-nums"
					aria-label="금액"
				/>
				<select
					name="category"
					value={v.category}
					class="input col-span-2 sm:col-span-1"
					aria-label="분류"
				>
					{#each spendCats as c (c.name)}<option value={c.name}>{c.name}</option>{/each}
				</select>
			</div>
			<label class="mt-2 block">
				<span class="eyebrow mb-1 block">어디서 나가나요? (카드·통장)</span>
				<select name="methodId" value={v.methodId} class="input" aria-label="결제수단">
					<option value="">정하지 않음 — 통장·카드 잔액에는 반영 안 돼요</option>
					{#if methodsOf('card').length > 0}
						<optgroup label="카드">
							{#each methodsOf('card') as m (m.id)}<option value={String(m.id)}>{m.name}</option>{/each}
						</optgroup>
					{/if}
					{#if methodsOf('account').length > 0}
						<optgroup label="통장">
							{#each methodsOf('account') as m (m.id)}<option value={String(m.id)}>{m.name}</option>{/each}
						</optgroup>
					{/if}
				</select>
			</label>
		{/snippet}

		{#if open === 'fixed'}
			<form
				method="POST"
				action={act('addFixed')}
				use:enhance={closeOnSuccess}
				class="mt-3 space-y-2.5 rounded-xl bg-surface-2 p-3"
			>
				{@render fixedFields({
						name: '',
						day: '',
						amount: '',
						category: spendCats[0]?.name ?? '',
						methodId: ''
					})}
				{#if msg('addFixed')}<p class="msg-error">{msg('addFixed')}</p>{/if}
				<div class="flex justify-end gap-1.5">
					<button type="button" class="btn-ghost" onclick={() => (open = null)}>취소</button>
					<button class="btn btn-sm">추가</button>
				</div>
			</form>
		{/if}

		<ul class="mt-3 divide-y divide-line">
			{#each data.fixedDefs as def (def.id)}
				{#if open === `fixed:${def.id}`}
					<li class="py-2">
						<form
							method="POST"
							action={act('updateFixed')}
							use:enhance={closeOnSuccess}
							class="space-y-2.5 rounded-xl bg-surface-2 p-3"
						>
							<input type="hidden" name="id" value={def.id} />
							{@render fixedFields({
								name: def.name,
								day: def.day,
								amount: num(def.amount),
								category: def.category,
								methodId: def.methodId === null ? '' : String(def.methodId)
							})}
							{#if msg('updateFixed')}<p class="msg-error">{msg('updateFixed')}</p>{/if}
							<div class="flex justify-end gap-1.5">
								<button type="button" class="btn-ghost" onclick={() => (open = null)}>취소</button>
								<button class="btn btn-sm">저장</button>
							</div>
						</form>
					</li>
				{:else}
					{@const recorded = data.recordedFixedIds.includes(def.id)}
					<li class="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
						<div class="min-w-0 flex-1">
							<p class="truncate text-[14px] font-semibold">{def.name}</p>
							<p class="text-[12px] text-mute">
								매달 {def.day}일 · {def.category} ·
								{#if def.methodName}
									<span class="font-semibold text-ink">{def.methodName}</span>
								{:else}
									<span class="text-faint">결제수단 없음</span>
								{/if}
							</p>
						</div>
						<span class="font-num text-[14px] font-semibold tabular-nums">{num(def.amount)}원</span>
						{#if recorded}
							<span class="pill bg-income-soft text-income"
								><Icon name="check" size={11} /> 기록됨</span
							>
						{:else if def.day <= dueDay}
							<form method="POST" action={act('recordFixed')} use:enhance>
								<input type="hidden" name="month" value={data.month} />
								<input type="hidden" name="id" value={def.id} />
								<button class="btn-ghost !border-brand/50 !text-brand">이번 달 기록</button>
							</form>
						{:else}
							<span class="pill bg-surface-2 text-mute">{def.day}일 예정</span>
						{/if}
						<div class="flex items-center">
							<button
								class="iconbtn"
								aria-label="{def.name} 수정"
								onclick={() => (open = `fixed:${def.id}`)}
							>
								<Icon name="edit" size={14} />
							</button>
							<form method="POST" action={act('deleteFixed')} use:enhance>
								<input type="hidden" name="id" value={def.id} />
								<button class="iconbtn iconbtn-danger" aria-label="{def.name} 삭제"
									><Icon name="trash" size={14} /></button
								>
							</form>
						</div>
					</li>
				{/if}
			{:else}
				<li class="py-6 text-center text-[13px] text-mute">
					월세, 구독료처럼 매달 같은 날 나가는 돈을 등록해 두세요.
				</li>
			{/each}
		</ul>
	</section>
	{/if}

	<div class="space-y-4">
		<!-- ── 분류 ────────────────────────────── -->
		{#if tab === 'categories'}
		<section class="card p-4 sm:p-5" aria-label="분류">
			<header class="flex flex-wrap items-center justify-between gap-2">
				<h2 class="card-title">분류</h2>
				<div class="flex items-center gap-2">
					<div
						class="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1"
						role="group"
						aria-label="분류 종류"
					>
						{#each [['spend', '지출'], ['income', '입금']] as const as [k, label] (k)}
							<button
								class="rounded-lg px-3 py-1 text-[12px] font-bold {catKind === k
									? 'bg-surface text-ink shadow-sm'
									: 'text-mute'}"
								aria-pressed={catKind === k}
								onclick={() => {
									catKind = k;
									open = null;
								}}
							>
								{label}
							</button>
						{/each}
					</div>
					<button class="btn-ghost" onclick={() => (open = open === 'cat' ? null : 'cat')}>
						<Icon name="plus" size={13} /> 추가
					</button>
				</div>
			</header>

			{#if msg('catDelete', 'budgetSet')}<p class="msg-error mt-3">
					{msg('catDelete', 'budgetSet')}
				</p>{/if}

			{#if open === 'cat'}
				<form
					method="POST"
					action={act('catAdd')}
					use:enhance={closeOnSuccess}
					class="mt-3 space-y-3 rounded-xl bg-surface-2 p-3"
				>
					<input type="hidden" name="kind" value={catKind} />
					<input name="name" placeholder="분류 이름" class="input" aria-label="이름" />
					{#if catKind === 'spend'}
						<label class="block">
							<span class="eyebrow mb-1 block">월 예산 (선택)</span>
							<input
								name="budget"
								value=""
								oninput={money}
								inputmode="numeric"
								placeholder="예: 400,000 · 비우면 예산 없음"
								class="input font-num tabular-nums"
							/>
						</label>
					{/if}
					{@render colorPicker(COLOR_CHOICES[5])}
					{#if catKind === 'spend'}{@render naturePicker('consume')}{/if}
					{#if msg('catAdd')}<p class="msg-error">{msg('catAdd')}</p>{/if}
					<div class="flex justify-end gap-1.5">
						<button type="button" class="btn-ghost" onclick={() => (open = null)}>취소</button>
						<button class="btn btn-sm">추가</button>
					</div>
				</form>
			{/if}

			<ul class="mt-3 divide-y divide-line">
				{#each shownCats as c (c.id)}
					{#if open === `cat:${c.id}`}
						<li class="py-2">
							<form
								method="POST"
								action={act('catUpdate')}
								use:enhance={closeOnSuccess}
								class="space-y-3 rounded-xl bg-surface-2 p-3"
							>
								<input type="hidden" name="id" value={c.id} />
								<input type="hidden" name="kind" value={c.kind} />
								<input name="name" value={c.name} class="input" aria-label="이름" />
								{#if catKind === 'spend'}
									<label class="block">
										<span class="eyebrow mb-1 block">월 예산 (선택)</span>
										<input
											name="budget"
											value={budgetOf(c.name) === null ? '' : num(budgetOf(c.name)!)}
											oninput={money}
											inputmode="numeric"
											placeholder="예: 400,000 · 비우면 예산 없음"
											class="input font-num tabular-nums"
										/>
									</label>
								{/if}
								{@render colorPicker(c.color)}
								{#if catKind === 'spend'}{@render naturePicker(c.nature)}{/if}
								{#if msg('catUpdate')}<p class="msg-error">{msg('catUpdate')}</p>{/if}
								<div class="flex justify-end gap-1.5">
									<button type="button" class="btn-ghost" onclick={() => (open = null)}>취소</button
									>
									<button class="btn btn-sm">저장</button>
								</div>
							</form>
						</li>
					{:else}
						<li class="flex items-center gap-3 py-2.5">
							<span class="h-3 w-3 shrink-0 rounded-full" style="background: {c.color}"></span>
							<span class="min-w-[4.5rem] flex-1">
								<span class="block truncate text-[14px] font-semibold">{c.name}</span>
								{#if c.builtin || (c.kind === 'spend' && c.nature === 'bill')}
									<span class="block text-[10.5px] leading-tight text-faint">
										{[c.builtin ? '기본' : '', c.kind === 'spend' && c.nature === 'bill' ? '공과금' : '']
											.filter(Boolean)
											.join(' · ')}
									</span>
								{/if}
							</span>
							{#if c.kind === 'spend'}
								<form method="POST" action={act('budgetSet')} use:enhance class="relative w-28 shrink-0">
									<input type="hidden" name="id" value={c.id} />
									<input
										name="budget"
										value={budgetOf(c.name) === null ? '' : num(budgetOf(c.name)!)}
										oninput={money}
										onchange={(e) => e.currentTarget.form?.requestSubmit()}
										inputmode="numeric"
										placeholder="월 예산"
										class="input h-8 pr-7 text-right font-num text-[13px] tabular-nums"
										aria-label="{c.name} 월 예산"
									/>
									<span class="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[12px] text-mute">원</span>
								</form>
							{/if}
							<button
								class="iconbtn"
								aria-label="{c.name} 수정"
								onclick={() => (open = `cat:${c.id}`)}
							>
								<Icon name="edit" size={14} />
							</button>
							{#if !c.builtin}
								<form method="POST" action={act('catDelete')} use:enhance>
									<input type="hidden" name="id" value={c.id} />
									<button class="iconbtn iconbtn-danger" aria-label="{c.name} 삭제"
										><Icon name="trash" size={14} /></button
									>
								</form>
							{:else}
								<span class="w-8 shrink-0"></span>
							{/if}
						</li>
					{/if}
				{/each}
			</ul>
		</section>
		{/if}

		<div class="space-y-4">
			<!-- ── 결제수단 ──────────────────────── -->
			{#if tab === 'methods'}
			<section class="card flex-1 p-4 sm:p-5" aria-label="결제수단">
				<header class="flex items-center justify-between gap-2">
					<h2 class="card-title">결제수단</h2>
					<button class="btn-ghost" onclick={() => (open = open === 'method' ? null : 'method')}>
						<Icon name="plus" size={13} /> 추가
					</button>
				</header>

				{#if msg('methodDelete')}<p class="msg-error mt-3">{msg('methodDelete')}</p>{/if}

				{#if open === 'method'}
					<form
						method="POST"
						action={act('methodAdd')}
						use:enhance={closeOnSuccess}
						class="mt-3 space-y-2.5 rounded-xl bg-surface-2 p-3"
					>
						<div class="grid grid-cols-[110px_minmax(0,1fr)] gap-2">
							<select name="kind" bind:value={newMethodKind} class="input" aria-label="종류">
								<option value="card">카드</option>
								<option value="account">통장</option>
							</select>
							<input name="name" placeholder="이름" class="input" aria-label="이름" />
						</div>
						{#if newMethodKind === 'card'}
							<div class="grid grid-cols-2 gap-2">
								<label class="block">
									<span class="eyebrow mb-1 block">이용기간 시작일</span>
									<input
										name="cycleStart"
										bind:value={newCycle}
										inputmode="numeric"
										placeholder="1 (비우면 1일)"
										class="input font-num tabular-nums"
										aria-label="카드 이용기간 시작일"
									/>
								</label>
								<label class="block">
									<span class="eyebrow mb-1 block">결제일</span>
									<input
										name="payDay"
										bind:value={newPay}
										inputmode="numeric"
										placeholder="예: 15"
										class="input font-num tabular-nums"
										aria-label="카드 결제일"
									/>
								</label>
							</div>
							<p class="text-[12px] leading-relaxed text-mute">
								{cycleText(cycleNum(newCycle), payNum(newPay))}
							</p>
						{/if}
						{#if msg('methodAdd')}<p class="msg-error">{msg('methodAdd')}</p>{/if}
						<div class="flex justify-end gap-1.5">
							<button type="button" class="btn-ghost" onclick={() => (open = null)}>취소</button>
							<button class="btn btn-sm">추가</button>
						</div>
					</form>
				{/if}

				{#each [['card', '카드'], ['account', '통장']] as const as [kind, label] (kind)}
					<h3 class="eyebrow mt-4">{label}</h3>
					<ul class="divide-y divide-line">
						{#each methodsOf(kind) as m (m.id)}
							{#if open === `method:${m.id}`}
								<li class="py-2">
									<form
										method="POST"
										action={act('methodUpdate')}
										use:enhance={closeOnSuccess}
										class="space-y-2.5 rounded-xl bg-surface-2 p-3"
									>
										<input type="hidden" name="id" value={m.id} />
										<input name="name" value={m.name} class="input" aria-label="이름" />
										{#if m.kind === 'card'}
											<div class="grid grid-cols-2 gap-2">
												<label class="block">
													<span class="eyebrow mb-1 block">이용기간 시작일</span>
													<input
														name="cycleStart"
														value={m.cycleStart}
														inputmode="numeric"
														class="input font-num tabular-nums"
														aria-label="카드 이용기간 시작일"
													/>
												</label>
												<label class="block">
													<span class="eyebrow mb-1 block">결제일</span>
													<input
														name="payDay"
														value={m.payDay ?? ''}
														inputmode="numeric"
														placeholder="예: 15"
														class="input font-num tabular-nums"
														aria-label="카드 결제일"
													/>
												</label>
											</div>
											<p class="text-[12px] leading-relaxed text-mute">
												지금 설정: {cycleText(m.cycleStart, m.payDay)}
											</p>
										{/if}
										{#if msg('methodUpdate')}<p class="msg-error">{msg('methodUpdate')}</p>{/if}
										<div class="flex justify-end gap-1.5">
											<button type="button" class="btn-ghost" onclick={() => (open = null)}
												>취소</button
											>
											<button class="btn btn-sm">저장</button>
										</div>
									</form>
								</li>
							{:else}
								<li class="flex items-center gap-3 py-2.5">
									<Icon name={m.kind === 'card' ? 'card' : 'wallet'} size={16} />
									<span class="min-w-0 flex-1">
										<span class="block truncate text-[14px] font-semibold">{m.name}</span>
										{#if m.kind === 'card'}
											<span class="block text-[11px] leading-snug text-mute">
												{m.payDay ? cycleText(m.cycleStart, m.payDay) : '결제일 미정'}
											</span>
										{/if}
									</span>
									<button
										class="iconbtn"
										aria-label="{m.name} 수정"
										onclick={() => (open = `method:${m.id}`)}
									>
										<Icon name="edit" size={14} />
									</button>
									<form method="POST" action={act('methodDelete')} use:enhance>
										<input type="hidden" name="id" value={m.id} />
										<button class="iconbtn iconbtn-danger" aria-label="{m.name} 삭제"
											><Icon name="trash" size={14} /></button
										>
									</form>
								</li>
							{/if}
						{:else}
							<li class="py-3 text-[13px] text-mute">등록된 {label}가 없어요.</li>
						{/each}
					</ul>
				{/each}
			</section>
			{/if}

			<!-- ── 저축 목표 ─────────────────────── -->
			{#if tab === 'goals'}
			<section class="card flex-1 p-4 sm:p-5" aria-label="저축 목표">
				<header class="flex items-center justify-between gap-2">
					<h2 class="card-title">저축 목표</h2>
					<button class="btn-ghost" onclick={() => (open = open === 'goal' ? null : 'goal')}>
						<Icon name="plus" size={13} /> 추가
					</button>
				</header>

				<p class="mt-2 text-[12px] leading-relaxed text-mute">
					저축을 기록할 때 아래 목표 중 하나를 골라요. 이번 달 모아야 할 금액은 목표별 남은 금액을
					남은 달 수로 나눠 자동으로 계산해요.
				</p>

				{#snippet goalFields(v: { name: string; amount: string; endMonth: string; initial: string })}
					<div class="grid grid-cols-2 gap-2">
						<input
							name="name"
							value={v.name}
							placeholder="목표 이름"
							class="input col-span-2"
							aria-label="이름"
						/>
						<input
							name="amount"
							value={v.amount}
							oninput={money}
							inputmode="numeric"
							placeholder="목표 금액"
							class="input font-num tabular-nums"
							aria-label="목표 금액"
						/>
						<input
							name="endMonth"
							type="month"
							value={v.endMonth}
							class="input font-num"
							aria-label="목표 달"
							/>
							<label class="col-span-2 block">
								<span class="eyebrow mb-1 block">기존 저축금액 (이미 모아 둔 돈 · 선택)</span>
								<input
									name="initial"
									value={v.initial}
									oninput={money}
									inputmode="numeric"
									placeholder="예: 1,200,000"
									class="input font-num tabular-nums"
									aria-label="기존 저축금액"
								/>
							</label>
						</div>
				{/snippet}

				{#if open === 'goal'}
					<form
						method="POST"
						action={act('goalAdd')}
						use:enhance={closeOnSuccess}
						class="mt-3 space-y-2.5 rounded-xl bg-surface-2 p-3"
					>
						{@render goalFields({ name: '', amount: '', endMonth: '', initial: '' })}
						{#if msg('goalAdd')}<p class="msg-error">{msg('goalAdd')}</p>{/if}
						<div class="flex justify-end gap-1.5">
							<button type="button" class="btn-ghost" onclick={() => (open = null)}>취소</button>
							<button class="btn btn-sm">추가</button>
						</div>
					</form>
				{/if}

				<ul class="mt-3 divide-y divide-line">
					{#each data.savingsGoals as g (g.id)}
						{#if open === `goal:${g.id}`}
							<li class="py-2">
								<form
									method="POST"
									action={act('goalUpdate')}
									use:enhance={closeOnSuccess}
									class="space-y-2.5 rounded-xl bg-surface-2 p-3"
								>
									<input type="hidden" name="id" value={g.id} />
									{@render goalFields({
										name: g.name,
										amount: num(g.targetAmount),
										endMonth: g.endMonth,
										initial: g.initialAmount ? num(g.initialAmount) : ''
									})}
									{#if msg('goalUpdate')}<p class="msg-error">{msg('goalUpdate')}</p>{/if}
									<div class="flex justify-end gap-1.5">
										<button type="button" class="btn-ghost" onclick={() => (open = null)}
											>취소</button
										>
										<button class="btn btn-sm">저장</button>
									</div>
								</form>
							</li>
						{:else}
							<li class="flex items-center gap-3 py-2.5">
								<div class="min-w-0 flex-1">
									<p class="truncate text-[14px] font-semibold">{g.name}</p>
									<p class="tnum text-[12px] text-mute">
										{num(g.targetAmount)}원 · {g.endMonth}까지 · {g.progress}% 달성{g.initialAmount
												? ` · 기존 ${num(g.initialAmount)}원 포함`
												: ''}
									</p>
								</div>
								<button
									class="iconbtn"
									aria-label="{g.name} 수정"
									onclick={() => (open = `goal:${g.id}`)}
								>
									<Icon name="edit" size={14} />
								</button>
								<form method="POST" action={act('goalDelete')} use:enhance>
									<input type="hidden" name="id" value={g.id} />
									<button class="iconbtn iconbtn-danger" aria-label="{g.name} 삭제"
										><Icon name="trash" size={14} /></button
									>
								</form>
							</li>
						{/if}
					{:else}
						<li class="py-6 text-center text-[13px] text-mute">
							여행 자금, 비상금처럼 모으고 싶은 목표를 만들어 보세요.
						</li>
					{/each}
				</ul>
			</section>
			{/if}
		</div>
	</div>

	<!-- ── 내보내기 ─────────────────────────────── -->
	{#if tab === 'data'}
	<section class="card p-4 sm:p-5" aria-label="데이터 내보내기">
		<h2 class="card-title">데이터 내보내기</h2>
		<p class="mt-0.5 text-[12.5px] leading-relaxed text-mute">
			입력한 데이터를 엑셀에서 바로 열 수 있는 CSV 파일로 내려받아요. 내려받기만 하고 저장된 데이터는 바뀌지 않아요.
		</p>
		<div class="mt-3 flex flex-wrap gap-2">
			{#each EXPORTS as [type, label] (type)}
				<a class="btn-ghost" href={resolve(`/export?type=${type}`)} download>{label}</a>
			{/each}
		</div>
	</section>

	<!-- ── 데이터 ─────────────────────────────── -->
	<section
		class="card flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5"
		aria-label="데이터"
	>
		<div>
			<h2 class="card-title">데이터 모두 지우기</h2>
			<p class="mt-0.5 text-[12.5px] text-mute">
				저장된 내역, 고정지출, 예산, 저축 목표, 결제수단을 모두 지워요. 되돌릴 수 없어요.
			</p>
		</div>
		{#if confirmReset}
			<form method="POST" action="?/clearAll" class="flex items-center gap-2">
				<span class="text-[12.5px] font-medium text-danger">정말 모두 지울까요?</span>
				<button type="button" class="btn-ghost" onclick={() => (confirmReset = false)}>취소</button>
				<button class="btn btn-sm btn-danger">모두 지우기</button>
			</form>
		{:else}
			<button
				class="btn-ghost !border-danger/40 !text-danger"
				onclick={() => (confirmReset = true)}
			>
				<Icon name="trash" size={13} /> 모두 지우기
			</button>
		{/if}
	</section>
	{/if}
</div>
