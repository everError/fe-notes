import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import * as db from '#lib/server/db';
import { isValidMonth, parseAmount } from '#lib/format';

export const load: PageServerLoad = async ({ parent }) => {
	await db.ensureSeeded();
	const { month } = await parent();
	return db.getMonthData(month, 1);
};

export const actions: Actions = {
	/** 이번 달 저축 목표 — 빈 값으로 저장하면 목표를 해제한다 */
	setSaveGoal: async ({ request }) => {
		const form = await request.formData();
		const month = String(form.get('month') ?? '');
		const rawAmount = form.get('amount');
		if (!isValidMonth(month))
			return fail(400, { where: 'setSaveGoal', message: '잘못된 달이에요.' });

		if (typeof rawAmount === 'string' && rawAmount.trim() === '') {
			db.setMonthSaveGoal(month, null);
			return { where: 'setSaveGoal', ok: true };
		}
		const amount = parseAmount(rawAmount);
		if (!Number.isFinite(amount) || amount < 0)
			return fail(400, { where: 'setSaveGoal', message: '금액을 확인해 주세요.' });
		db.setMonthSaveGoal(month, amount);
		return { where: 'setSaveGoal', ok: true };
	}
};
