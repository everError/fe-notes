import type { PageServerLoad } from './$types';
import * as db from '#lib/server/db';
import type { EntrySort } from '#lib/server/db';
import { daysInMonthOf, pad2 } from '#lib/format';
import { DATE_RE } from '#lib/server/validate';
import type { Kind } from '#lib/types';

const SORTS: EntrySort[] = ['date_desc', 'date_asc', 'amount_desc', 'amount_asc'];

const readDate = (raw: string | null) => (raw && DATE_RE.test(raw) ? raw : undefined);

/** 금액 입력 — 쉼표·단위를 걷어내고 0 이상의 정수만 받는다 */
function readMoney(raw: string | null): number | undefined {
	const digits = (raw ?? '').replace(/[^\d]/g, '');
	return digits ? Number(digits) : undefined;
}

export const load: PageServerLoad = async ({ url, parent }) => {
	await db.ensureSeeded();
	const { month } = await parent();
	const p = url.searchParams;

	// 기간을 따로 주지 않으면 보고 있는 달 전체, range=all 이면 전체 기간
	const hasRange = p.has('from') || p.has('to');
	const all = p.get('range') === 'all';
	const from = readDate(p.get('from')) ?? (hasRange || all ? undefined : `${month}-01`);
	const to =
		readDate(p.get('to')) ??
		(hasRange || all ? undefined : `${month}-${pad2(daysInMonthOf(month))}`);

	const kindRaw = p.get('kind');
	const kind: Kind | undefined =
		kindRaw === 'spend' || kindRaw === 'income' || kindRaw === 'save' ? kindRaw : undefined;
	const pay = kindRaw === 'pay'; // 카드대금 결제만 보기
	const transferOnly = kindRaw === 'transfer'; // 송금만 보기
	const natureRaw = p.get('nature');
	const nature = natureRaw === 'consume' || natureRaw === 'bill' ? natureRaw : undefined;
	const sortRaw = p.get('sort') as EntrySort | null;
	const sort: EntrySort = sortRaw && SORTS.includes(sortRaw) ? sortRaw : 'date_desc';
	const methodId = Number(p.get('method'));
	const sourceRaw = p.get('source');

	const filter = {
		q: (p.get('q') ?? '').trim() || undefined,
		kind,
		categories: p.getAll('category').filter(Boolean),
		methodKind: p.get('mkind') === 'card' || p.get('mkind') === 'account' ? (p.get('mkind') as 'card' | 'account') : undefined,
		methodId: Number.isInteger(methodId) && methodId > 0 ? methodId : undefined,
		from,
		to,
		min: readMoney(p.get('min')),
		max: readMoney(p.get('max')),
		source: sourceRaw === 'fixed' || sourceRaw === 'manual' || sourceRaw === 'installment'
				? sourceRaw
				: undefined,
		nature,
		sort
	} as const;

	// 카드대금 결제는 종류·분류·성격·구분 조건이 없거나 '카드대금 결제'를 골랐을 때만 함께 보인다
	const plain =
		!kind && filter.categories.length === 0 && !filter.methodKind && !nature && !filter.source;
	const payments = pay || (plain && !transferOnly) ? db.searchCardPayments(filter) : [];
	const transfers = transferOnly || (plain && !pay) ? db.searchTransfers(filter) : [];

	return {
		filter,
		pay,
		transferOnly,
		payments,
		transfers,
		transferTotal: transfers.reduce((sum, x) => sum + x.amount, 0),
		paidTotal: payments.reduce((sum, x) => sum + x.amount, 0),
		result: pay || transferOnly
			? { rows: [], count: 0, spend: 0, income: 0, save: 0, byCategory: [] }
			: db.searchEntries(filter),
		categories: db.listCategories(),
		paymentMethods: db.listPaymentMethods(),
		isDefaultRange: !hasRange && !all
	};
};
