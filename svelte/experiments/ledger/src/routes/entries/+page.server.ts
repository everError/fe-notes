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
	const sortRaw = p.get('sort') as EntrySort | null;
	const sort: EntrySort = sortRaw && SORTS.includes(sortRaw) ? sortRaw : 'date_desc';
	const methodId = Number(p.get('method'));
	const sourceRaw = p.get('source');

	const filter = {
		q: (p.get('q') ?? '').trim() || undefined,
		kind,
		category: p.get('category') || undefined,
		methodId: Number.isInteger(methodId) && methodId > 0 ? methodId : undefined,
		from,
		to,
		min: readMoney(p.get('min')),
		max: readMoney(p.get('max')),
		source: sourceRaw === 'fixed' || sourceRaw === 'manual' ? sourceRaw : undefined,
		sort
	} as const;

	return {
		filter,
		result: db.searchEntries(filter),
		categories: db.listCategories(),
		paymentMethods: db.listPaymentMethods(),
		isDefaultRange: !hasRange && !all
	};
};
