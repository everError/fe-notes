import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import * as db from '#lib/server/db';
import { isValidMonth, monthKey, parseAmount } from '#lib/format';
import {
	COLOR_RE,
	hasCategory,
	hasGoal,
	hasMethod,
	readCategory,
	readInt,
	readMethodId,
	readPayDay,
	readCycleStart
} from '#lib/server/validate';

/** 기존 저축금액 입력 — 비우면 0, 숫자가 아니면 NaN */
function readInitial(raw: FormDataEntryValue | null): number {
	const text = String(raw ?? '').trim();
	if (text === '') return 0;
	const n = parseAmount(text);
	return Number.isFinite(n) && n >= 0 ? n : NaN;
}

/** 월 예산 입력 — 비우면 null(예산 없음), 숫자가 아니면 NaN */
function readBudget(raw: FormDataEntryValue | null): number | null {
	if (typeof raw !== 'string' || raw.trim() === '') return null;
	const n = parseAmount(raw);
	return Number.isFinite(n) && n > 0 ? n : NaN;
}

export const load: PageServerLoad = async ({ parent }) => {
	await db.ensureSeeded();
	const { month } = await parent();
	return db.getMonthData(month, 1);
};

/** 고정지출 입력 검증 — 통과하면 값을, 아니면 실패 응답을 돌려준다 */
function readFixed(form: FormData, where: string) {
	const name = String(form.get('name') ?? '').trim();
	const day = Number(form.get('day'));
	const amount = parseAmount(form.get('amount'));
	const category = String(form.get('category') ?? '');

	if (!name) return fail(400, { where, message: '이름을 입력해 주세요.' });
	if (!Number.isInteger(day) || day < 1 || day > 31)
		return fail(400, { where, message: '지정일은 1~31 사이로 입력해 주세요.' });
	if (!Number.isFinite(amount) || amount <= 0)
		return fail(400, { where, message: '금액을 입력해 주세요.' });
	if (!readCategory('spend', category)) return fail(400, { where, message: '분류를 골라 주세요.' });
	const methodId = readMethodId(form.get('methodId'));
	if (String(form.get('methodId') ?? '') !== '' && methodId === null)
		return fail(400, { where, message: '결제수단을 확인해 주세요.' });
	return { name, day, amount, category, methodId };
}

export const actions: Actions = {
	/* ---------------- 고정지출 ---------------- */

	addFixed: async ({ request }) => {
		const v = readFixed(await request.formData(), 'addFixed');
		if ('status' in v) return v;
		db.addFixed(v.name, v.day, v.amount, v.category, v.methodId);
		return { where: 'addFixed', ok: true };
	},

	updateFixed: async ({ request }) => {
		const form = await request.formData();
		const id = readInt(form.get('id'));
		if (id === null) return fail(400, { where: 'updateFixed', message: '잘못된 항목이에요.' });
		const v = readFixed(form, 'updateFixed');
		if ('status' in v) return v;
		db.updateFixed(id, v.name, v.day, v.amount, v.category, v.methodId);
		return { where: 'updateFixed', ok: true };
	},

	deleteFixed: async ({ request }) => {
		const id = readInt((await request.formData()).get('id'));
		if (id === null) return fail(400, { where: 'deleteFixed', message: '잘못된 항목이에요.' });
		db.deleteFixed(id);
		return { where: 'deleteFixed', ok: true };
	},

	recordFixed: async ({ request }) => {
		const form = await request.formData();
		const month = String(form.get('month') ?? '');
		const id = readInt(form.get('id'));
		if (!isValidMonth(month))
			return fail(400, { where: 'recordFixed', message: '잘못된 달이에요.' });
		if (id === null) return fail(400, { where: 'recordFixed', message: '잘못된 항목이에요.' });
		if (month > monthKey(new Date()))
			return fail(400, { where: 'recordFixed', message: '앞으로 올 달에는 기록할 수 없어요.' });
		db.recordFixed(id, month);
		return { where: 'recordFixed', ok: true };
	},

	/* ---------------- 분류 ---------------- */

	catAdd: async ({ request }) => {
		const form = await request.formData();
		const kind = form.get('kind') === 'income' ? 'income' : 'spend';
		const name = String(form.get('name') ?? '').trim();
		const color = String(form.get('color') ?? '').trim();

		if (!name) return fail(400, { where: 'catAdd', message: '이름을 입력해 주세요.' });
		if (!COLOR_RE.test(color)) return fail(400, { where: 'catAdd', message: '색을 골라 주세요.' });
		if (hasCategory(kind, name))
			return fail(400, { where: 'catAdd', message: '같은 이름의 분류가 이미 있어요.' });

		const budget = readBudget(form.get('budget'));
		if (Number.isNaN(budget))
			return fail(400, { where: 'catAdd', message: '월 예산 금액을 확인해 주세요.' });

		db.addCategory(kind, name, color, form.get('nature') === 'bill' ? 'bill' : 'consume');
		if (kind === 'spend') db.setBudget(name, budget);
		return { where: 'catAdd', ok: true };
	},

	catUpdate: async ({ request }) => {
		const form = await request.formData();
		const id = readInt(form.get('id'));
		const kind = form.get('kind') === 'income' ? 'income' : 'spend';
		const name = String(form.get('name') ?? '').trim();
		const color = String(form.get('color') ?? '').trim();

		if (id === null) return fail(400, { where: 'catUpdate', message: '잘못된 분류예요.' });
		if (!name) return fail(400, { where: 'catUpdate', message: '이름을 입력해 주세요.' });
		if (!COLOR_RE.test(color))
			return fail(400, { where: 'catUpdate', message: '색을 골라 주세요.' });
		if (hasCategory(kind, name, id))
			return fail(400, { where: 'catUpdate', message: '같은 이름의 분류가 이미 있어요.' });

		const budget = readBudget(form.get('budget'));
		if (Number.isNaN(budget))
			return fail(400, { where: 'catUpdate', message: '월 예산 금액을 확인해 주세요.' });

		const nature = form.get('nature');
		db.updateCategory(id, name, color, nature === 'bill' ? 'bill' : nature === 'consume' ? 'consume' : undefined);
		if (kind === 'spend') db.setBudget(name, budget);
		return { where: 'catUpdate', ok: true };
	},

	catDelete: async ({ request }) => {
		const id = readInt((await request.formData()).get('id'));
		if (id === null) return fail(400, { where: 'catDelete', message: '잘못된 분류예요.' });
		if (!db.deleteCategory(id))
			return fail(400, {
				where: 'catDelete',
				message: '기본 분류이거나 사용한 내역이 있으면 지울 수 없어요.'
			});
		return { where: 'catDelete', ok: true };
	},

	/* ---------------- 월 예산 ---------------- */

	budgetSet: async ({ request }) => {
		const form = await request.formData();
		const id = readInt(form.get('id'));
		const cat = db.listCategories().find((c) => c.id === id && c.kind === 'spend');
		if (!cat) return fail(400, { where: 'budgetSet', message: '잘못된 분류예요.' });
		const budget = readBudget(form.get('budget'));
		if (Number.isNaN(budget))
			return fail(400, { where: 'budgetSet', message: '월 예산 금액을 확인해 주세요.' });
		db.setBudget(cat.name, budget);
		return { where: 'budgetSet', ok: true };
	},

	/* ---------------- 결제수단 ---------------- */

	methodAdd: async ({ request }) => {
		const form = await request.formData();
		const kind = form.get('kind') === 'account' ? 'account' : 'card';
		const name = String(form.get('name') ?? '').trim();

		if (!name) return fail(400, { where: 'methodAdd', message: '이름을 입력해 주세요.' });
		if (hasMethod(kind, name))
			return fail(400, { where: 'methodAdd', message: '같은 이름의 결제수단이 이미 있어요.' });

		const payDay = readPayDay(form.get('payDay'));
		if (payDay === undefined)
			return fail(400, { where: 'methodAdd', message: '결제일은 1~31일 사이로 입력해 주세요.' });

		const cycleStart = readCycleStart(form.get('cycleStart'));
		if (cycleStart === undefined)
			return fail(400, { where: 'methodAdd', message: '이용기간 시작일은 1~28일 사이로 입력해 주세요.' });

		db.addPaymentMethod(kind, name, payDay, cycleStart);
		return { where: 'methodAdd', ok: true };
	},

	methodUpdate: async ({ request }) => {
		const form = await request.formData();
		const id = readInt(form.get('id'));
		const name = String(form.get('name') ?? '').trim();

		const target = db.listPaymentMethods().find((m) => m.id === id);
		if (!target) return fail(400, { where: 'methodUpdate', message: '잘못된 결제수단이에요.' });
		if (!name) return fail(400, { where: 'methodUpdate', message: '이름을 입력해 주세요.' });
		if (hasMethod(target.kind, name, target.id))
			return fail(400, { where: 'methodUpdate', message: '같은 이름의 결제수단이 이미 있어요.' });

		const payDay = readPayDay(form.get('payDay'));
		if (payDay === undefined)
			return fail(400, { where: 'methodUpdate', message: '결제일은 1~31일 사이로 입력해 주세요.' });

		const cycleStart = readCycleStart(form.get('cycleStart'));
		if (cycleStart === undefined)
			return fail(400, {
				where: 'methodUpdate',
				message: '이용기간 시작일은 1~28일 사이로 입력해 주세요.'
			});

		db.updatePaymentMethod(target.id, name, payDay, cycleStart);
		return { where: 'methodUpdate', ok: true };
	},

	methodDelete: async ({ request }) => {
		const id = readInt((await request.formData()).get('id'));
		if (id === null) return fail(400, { where: 'methodDelete', message: '잘못된 결제수단이에요.' });
		if (!db.deletePaymentMethod(id))
			return fail(400, { where: 'methodDelete', message: '사용한 내역이 있으면 지울 수 없어요.' });
		return { where: 'methodDelete', ok: true };
	},

	/* ---------------- 저축 목표 ---------------- */

	goalAdd: async ({ request }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const amount = parseAmount(form.get('amount'));
		const endMonth = String(form.get('endMonth') ?? '');

		if (!name) return fail(400, { where: 'goalAdd', message: '이름을 입력해 주세요.' });
		if (!Number.isFinite(amount) || amount <= 0)
			return fail(400, { where: 'goalAdd', message: '목표 금액을 입력해 주세요.' });
		if (!isValidMonth(endMonth))
			return fail(400, { where: 'goalAdd', message: '목표 달을 골라 주세요.' });
		if (hasGoal(name))
			return fail(400, { where: 'goalAdd', message: '같은 이름의 목표가 이미 있어요.' });

		const initial = readInitial(form.get('initial'));
		if (Number.isNaN(initial))
			return fail(400, { where: 'goalAdd', message: '기존 저축금액을 확인해 주세요.' });

		db.addSavingsGoal(name, amount, endMonth, initial);
		return { where: 'goalAdd', ok: true };
	},

	goalUpdate: async ({ request }) => {
		const form = await request.formData();
		const id = readInt(form.get('id'));
		const name = String(form.get('name') ?? '').trim();
		const amount = parseAmount(form.get('amount'));
		const endMonth = String(form.get('endMonth') ?? '');

		if (id === null) return fail(400, { where: 'goalUpdate', message: '잘못된 목표예요.' });
		if (!name) return fail(400, { where: 'goalUpdate', message: '이름을 입력해 주세요.' });
		if (!Number.isFinite(amount) || amount <= 0)
			return fail(400, { where: 'goalUpdate', message: '목표 금액을 입력해 주세요.' });
		if (!isValidMonth(endMonth))
			return fail(400, { where: 'goalUpdate', message: '목표 달을 골라 주세요.' });
		if (hasGoal(name, id))
			return fail(400, { where: 'goalUpdate', message: '같은 이름의 목표가 이미 있어요.' });

		const initial = readInitial(form.get('initial'));
		if (Number.isNaN(initial))
			return fail(400, { where: 'goalUpdate', message: '기존 저축금액을 확인해 주세요.' });

		db.updateSavingsGoal(id, name, amount, endMonth, initial);
		return { where: 'goalUpdate', ok: true };
	},

	goalDelete: async ({ request }) => {
		const id = readInt((await request.formData()).get('id'));
		if (id === null) return fail(400, { where: 'goalDelete', message: '잘못된 목표예요.' });
		db.deleteSavingsGoal(id);
		return { where: 'goalDelete', ok: true };
	},

	/* ---------------- 데이터 ---------------- */

	clearAll: async () => {
		db.clearAll();
		redirect(303, '/');
	}
};
