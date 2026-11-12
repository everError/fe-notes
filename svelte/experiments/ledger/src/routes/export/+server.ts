import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as db from '#lib/server/db';
import type { ExportKind } from '#lib/server/db';
import { dateKey } from '#lib/format';

const KINDS: ExportKind[] = ['entries', 'payments', 'transfers', 'adjustments', 'balances'];

const esc = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** 입력한 데이터를 엑셀에서 열 수 있는 CSV로 내려받는다(읽기만 하고 DB는 바꾸지 않는다) */
export const GET: RequestHandler = async ({ url }) => {
	await db.ensureSeeded();
	const kind = url.searchParams.get('type') as ExportKind;
	if (!KINDS.includes(kind)) error(400, '내보낼 종류를 알 수 없어요.');
	const csv = '﻿' + db.exportTable(kind).map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n';
	return new Response(csv, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="ledger-${kind}-${dateKey(new Date())}.csv"`
		}
	});
};
