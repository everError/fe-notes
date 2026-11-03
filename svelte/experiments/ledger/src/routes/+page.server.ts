import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import * as db from '#lib/server/db';
import {
	addMonths,
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
	readMethodId
} from '#lib/server/validate';

export const load: PageServerLoad = async ({ url, parent }) => {
	await db.ensureSeeded();

	const { month } = await parent();
	const today = new Date();
	const daysInMonth = daysInMonthOf(month);
	const defaultDay = monthKey(today) === month ? today.getDate() : 1;

	const dayParam = Number(url.searchParams.get('d'));
	const selectedDay =
		Number.isInteger(dayParam) && dayParam >= 1 && dayParam <= daysInMonth ? dayParam : defaultDay;

	return db.getMonthData(month, selectedDay);
};

export const actions: Actions = {
	add: async ({ request }) => {
		const form = await request.formData();
		const date = String(form.get('date') ?? '');
		const kind = readKind(form.get('kind'));
		const amount = parseAmount(form.get('amount'));
		const category = kind ? readCategory(kind, form.get('category')) : null;
		const memo = String(form.get('memo') ?? '').trim();
		const methodId = kind === 'spend' ? readMethodId(form.get('methodId')) : null;
		const goalId = kind === 'save' ? readGoalId(form.get('goalId')) : null;

		if (!DATE_RE.test(date) || date > dateKey(new Date())) {
			return fail(400, { where: 'add', message: '오늘까지의 날짜만 기록할 수 있어요.' });
		}
		if (!kind) return fail(400, { where: 'add', message: '지출·입금·저축 중 하나를 골라 주세요.' });
		if (!Number.isFinite(amount) || amount <= 0)
			return fail(400, { where: 'add', message: '금액을 입력해 주세요.' });
		if (!category) return fail(400, { where: 'add', message: '분류를 골라 주세요.' });
		if (kind === 'save' && goalId === null)
			return fail(400, {
				where: 'add',
				message: db.listSavingsGoals().length
					? '저축할 목표를 골라 주세요.'
					: '먼저 관리 화면에서 저축 목표를 만들어 주세요.'
			});

		db.addEntry(date, kind, amount, category, memo, methodId, goalId);
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
		const methodId = kind === 'spend' ? readMethodId(form.get('methodId')) : null;
		const goalId = kind === 'save' ? readGoalId(form.get('goalId')) : null;

		if (id === null) return fail(400, { where: 'update', message: '잘못된 내역이에요.' });
		if (!DATE_RE.test(date))
			return fail(400, { where: 'update', message: '날짜 형식이 올바르지 않아요.' });
		if (!kind)
			return fail(400, { where: 'update', message: '지출·입금·저축 중 하나를 골라 주세요.' });
		if (!Number.isFinite(amount) || amount <= 0)
			return fail(400, { where: 'update', message: '금액을 입력해 주세요.' });
		if (!category) return fail(400, { where: 'update', message: '분류를 골라 주세요.' });
		if (kind === 'save' && goalId === null)
			return fail(400, {
				where: 'update',
				message: db.listSavingsGoals().length
					? '저축할 목표를 골라 주세요.'
					: '먼저 관리 화면에서 저축 목표를 만들어 주세요.'
			});

		db.updateEntry(id, date, kind, amount, category, memo, methodId, goalId);
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
		const amount = parseAmount(form.get('amount'));
		if (!isValidMonth(month)) return fail(400, { where: 'setStart', message: '잘못된 달이에요.' });
		if (!Number.isFinite(amount) || amount < 0)
			return fail(400, { where: 'setStart', message: '금액을 확인해 주세요.' });
		db.setStartAmount(month, amount);
		return { where: 'setStart', ok: true };
	},

	/** 지난달 마감 잔액을 이번 달 시작금액으로 이어받는다 */
	carryStart: async ({ request }) => {
		const month = String((await request.formData()).get('month') ?? '');
		if (!isValidMonth(month))
			return fail(400, { where: 'carryStart', message: '잘못된 달이에요.' });
		const prev = db.monthBalance(addMonths(month, -1));
		if (prev === null)
			return fail(400, {
				where: 'carryStart',
				message: '지난달 시작금액이 없어 이어받을 수 없어요.'
			});
		db.setStartAmount(month, Math.max(0, prev));
		return { where: 'carryStart', ok: true };
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
};
