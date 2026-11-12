import { fail } from '@sveltejs/kit';
import type { Actions } from '@sveltejs/kit';
import * as db from '#lib/server/db';
import {
	daysInMonthOf,
	isValidMonth,
	monthKey,
	parseAmount,
	dateKey
} from '#lib/format';
import {
	DATE_RE,
	readCategory,
	readGoalId,
	readInt,
	readKind,
	readMethodId,
	readAccountId,
	readInstallments
} from '#lib/server/validate';

/** 달 데이터 — ?d= 로 고른 날(없으면 오늘, 다른 달이면 1일) */
export function loadMonth(month: string, url: URL) {
	const today = new Date();
	const daysInMonth = daysInMonthOf(month);
	const defaultDay = monthKey(today) === month ? today.getDate() : 1;
	const dayParam = Number(url.searchParams.get('d'));
	const selectedDay =
		Number.isInteger(dayParam) && dayParam >= 1 && dayParam <= daysInMonth ? dayParam : defaultDay;
	return db.getMonthData(month, selectedDay);
}

/** 할부는 카드로 낸 지출에만 의미가 있다 */
function installmentsOf(kind: string, methodId: number | null, form: FormData): number {
	if (kind !== 'spend' || methodId === null) return 1;
	const card = db.listPaymentMethods().find((m) => m.id === methodId && m.kind === 'card');
	return card ? readInstallments(form.get('installments')) : 1;
}

const hasAccount = () => db.listPaymentMethods().some((m) => m.kind === 'account');

/** 가계부 기록 액션 — 달력 화면과 통장·카드 화면이 같이 쓴다 */
export const ledgerActions = {
	add: async ({ request }) => {
		const form = await request.formData();
		const date = String(form.get('date') ?? '');
		const kind = readKind(form.get('kind'));
		const amount = parseAmount(form.get('amount'));
		const category = kind ? readCategory(kind, form.get('category')) : null;
		const memo = String(form.get('memo') ?? '').trim();
		const methodId =
			kind === 'spend'
				? readMethodId(form.get('methodId'))
				: kind === 'income' || kind === 'save'
				? readAccountId(form.get('methodId'))
					: null;
		const goalId = kind === 'save' ? readGoalId(form.get('goalId')) : null;

		if (!DATE_RE.test(date) || date > dateKey(new Date())) {
			return fail(400, { where: 'add', message: '오늘까지의 날짜만 기록할 수 있어요.' });
		}
		if (!kind) return fail(400, { where: 'add', message: '지출·입금·저축 중 하나를 골라 주세요.' });
		if (!Number.isFinite(amount) || amount <= 0)
			return fail(400, { where: 'add', message: '금액을 입력해 주세요.' });
		if (!category) return fail(400, { where: 'add', message: '분류를 골라 주세요.' });
		if ((kind === 'income' || kind === 'save') && methodId === null && hasAccount())
			return fail(400, {
				where: 'add',
				message: kind === 'save' ? '어느 통장에서 저축했는지 골라 주세요.' : '입금된 통장을 골라 주세요.'
			});
		if (kind === 'save' && goalId === null)
			return fail(400, {
				where: 'add',
				message: db.listSavingsGoals().length
					? '저축할 목표를 골라 주세요.'
					: '먼저 관리 화면에서 저축 목표를 만들어 주세요.'
			});

		db.addEntry(date, kind, amount, category, memo, methodId, goalId, installmentsOf(kind, methodId, form));
		return { where: 'add', ok: true };
	},

	update: async ({ request }) => {
		const form = await request.formData();
		const id = readInt(form.get('id'));
		const date = String(form.get('date') ?? '');
		const kind = readKind(form.get('kind'));
		const amount = parseAmount(form.get('amount'));
		const category = kind ? readCategory(kind, form.get('category')) : null;
		const memo = String(form.get('memo') ?? '').trim();
		const methodId =
			kind === 'spend'
				? readMethodId(form.get('methodId'))
				: kind === 'income' || kind === 'save'
				? readAccountId(form.get('methodId'))
					: null;
		const goalId = kind === 'save' ? readGoalId(form.get('goalId')) : null;

		if (id === null) return fail(400, { where: 'update', message: '잘못된 내역이에요.' });
		if (!DATE_RE.test(date))
			return fail(400, { where: 'update', message: '날짜 형식이 올바르지 않아요.' });
		if (!kind)
			return fail(400, { where: 'update', message: '지출·입금·저축 중 하나를 골라 주세요.' });
		if (!Number.isFinite(amount) || amount <= 0)
			return fail(400, { where: 'update', message: '금액을 입력해 주세요.' });
		if (!category) return fail(400, { where: 'update', message: '분류를 골라 주세요.' });
		if ((kind === 'income' || kind === 'save') && methodId === null && hasAccount())
			return fail(400, {
				where: 'update',
				message: kind === 'save' ? '어느 통장에서 저축했는지 골라 주세요.' : '입금된 통장을 골라 주세요.'
			});
		if (kind === 'save' && goalId === null)
			return fail(400, {
				where: 'update',
				message: db.listSavingsGoals().length
					? '저축할 목표를 골라 주세요.'
					: '먼저 관리 화면에서 저축 목표를 만들어 주세요.'
			});

		db.updateEntry(
			id,
			date,
			kind,
			amount,
			category,
			memo,
			methodId,
			goalId,
			installmentsOf(kind, methodId, form)
		);
		return { where: 'update', ok: true };
	},

	delete: async ({ request }) => {
		const form = await request.formData();
		const id = readInt(form.get('id'));
		if (id === null) return fail(400, { where: 'delete', message: '잘못된 내역이에요.' });
		db.deleteEntry(id);
		return { where: 'delete', ok: true };
	},

	setStart: async ({ request }) => {
		const form = await request.formData();
		const month = String(form.get('month') ?? '');
		if (!isValidMonth(month)) return fail(400, { where: 'setStart', message: '잘못된 달이에요.' });
		const methods = db.listPaymentMethods();
		const next: [number, number | null][] = [];
		for (const a of methods) {
			const raw = String(form.get(`bal_${a.id}`) ?? '').trim();
			if (raw === '') {
				next.push([a.id, null]);
				continue;
			}
			const amount = parseAmount(raw);
			if (!Number.isFinite(amount) || amount < 0)
				return fail(400, { where: 'setStart', message: `'${a.name}' 금액을 확인해 주세요.` });
			next.push([a.id, amount]);
		}
		db.saveStartBalances(month, next);
		return { where: 'setStart', ok: true };
	},

	/** 통장에서 카드대금을 결제한다 */
	payCard: async ({ request }) => {
		const form = await request.formData();
		const methods = db.listPaymentMethods();
		const cardId = readInt(form.get('cardId'));
		const accountId = readInt(form.get('accountId'));
		const date = String(form.get('date') ?? '');
		const amount = parseAmount(form.get('amount'));
		if (cardId === null || !methods.some((m) => m.id === cardId && m.kind === 'card'))
			return fail(400, { where: 'payCard', message: '카드를 골라 주세요.' });
		if (accountId === null || !methods.some((m) => m.id === accountId && m.kind === 'account'))
			return fail(400, { where: 'payCard', message: '결제할 통장을 골라 주세요.' });
		if (!DATE_RE.test(date) || date > dateKey(new Date()))
			return fail(400, { where: 'payCard', message: '오늘까지의 날짜만 기록할 수 있어요.' });
		if (!Number.isFinite(amount) || amount <= 0)
			return fail(400, { where: 'payCard', message: '결제 금액을 입력해 주세요.' });
		db.addCardPayment(date, cardId, accountId, amount);
		return { where: 'payCard', ok: true };
	},

	/** 명세서에 찍힌 이번 결제 금액을 받아, 지금 계산된 금액과의 차이를 조정으로 기록한다 */
	adjustCard: async ({ request }) => {
		const form = await request.formData();
		const cardId = readInt(form.get('cardId'));
		const date = String(form.get('date') ?? '');
		const target = parseAmount(form.get('target'));
		const memo = String(form.get('memo') ?? '').trim();
		if (cardId === null || !db.listPaymentMethods().some((m) => m.id === cardId && m.kind === 'card'))
			return fail(400, { where: 'adjustCard', message: '카드를 골라 주세요.' });
		if (!DATE_RE.test(date) || date > dateKey(new Date()))
			return fail(400, { where: 'adjustCard', message: '오늘까지의 날짜만 기록할 수 있어요.' });
		if (!Number.isFinite(target) || target < 0)
			return fail(400, { where: 'adjustCard', message: '명세서 금액을 입력해 주세요.' });
		// 화면에 보이던 값이 아니라 지금 서버가 계산한 금액을 기준으로 차이를 구한다
		const diff = target - (db.cardDueAt(cardId, date) ?? 0);
		if (diff === 0)
			return fail(400, { where: 'adjustCard', message: '지금 계산된 금액과 같아서 맞출 게 없어요.' });
		db.addCardAdjustment(date, cardId, diff, memo || '명세서 금액에 맞춤');
		return { where: 'adjustCard', ok: true };
	},

	deleteCardAdjustment: async ({ request }) => {
		const id = readInt((await request.formData()).get('id'));
		if (id === null)
			return fail(400, { where: 'deleteCardAdjustment', message: '잘못된 기록이에요.' });
		db.deleteCardAdjustment(id);
		return { where: 'deleteCardAdjustment', ok: true };
	},

	deleteCardPayment: async ({ request }) => {
		const id = readInt((await request.formData()).get('id'));
		if (id === null)
			return fail(400, { where: 'deleteCardPayment', message: '잘못된 기록이에요.' });
		db.deleteCardPayment(id);
		return { where: 'deleteCardPayment', ok: true };
	},

	/** 통장에서 통장으로 송금한다 */
	transfer: async ({ request }) => {
		const form = await request.formData();
		const methods = db.listPaymentMethods();
		const fromId = readInt(form.get('fromId'));
		const toId = readInt(form.get('toId'));
		const date = String(form.get('date') ?? '');
		const amount = parseAmount(form.get('amount'));
		const isAccount = (id: number | null) => methods.some((m) => m.id === id && m.kind === 'account');
		if (fromId === null || !isAccount(fromId))
			return fail(400, { where: 'transfer', message: '보내는 통장을 골라 주세요.' });
		if (toId === null || !isAccount(toId))
			return fail(400, { where: 'transfer', message: '받는 통장을 골라 주세요.' });
		if (fromId === toId)
			return fail(400, { where: 'transfer', message: '보내는 통장과 받는 통장이 같아요.' });
		if (!DATE_RE.test(date) || date > dateKey(new Date()))
			return fail(400, { where: 'transfer', message: '오늘까지의 날짜만 기록할 수 있어요.' });
		if (!Number.isFinite(amount) || amount <= 0)
			return fail(400, { where: 'transfer', message: '송금 금액을 입력해 주세요.' });
		db.addTransfer(date, fromId, toId, amount);
		return { where: 'transfer', ok: true };
	},

	deleteTransfer: async ({ request }) => {
		const id = readInt((await request.formData()).get('id'));
		if (id === null) return fail(400, { where: 'deleteTransfer', message: '잘못된 기록이에요.' });
		db.deleteTransfer(id);
		return { where: 'deleteTransfer', ok: true };
	},

	/** 지정일이 지났지만 아직 기록하지 않은 고정지출을 한 번에 기록한다 */
	recordAllFixed: async ({ request }) => {
		const form = await request.formData();
		const month = String(form.get('month') ?? '');
		if (!isValidMonth(month))
			return fail(400, { where: 'recordAllFixed', message: '잘못된 달이에요.' });
		// 이번 달은 오늘까지 지정일이 지난 것만, 지난 달은 전부, 앞으로 올 달은 기록하지 않는다
		const nowMonth = monthKey(new Date());
		if (month > nowMonth) return { where: 'recordAllFixed', ok: true };
		db.recordAllFixed(month, month === nowMonth ? new Date().getDate() : 31);
		return { where: 'recordAllFixed', ok: true };
	}
} satisfies Actions;
