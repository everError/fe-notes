import * as db from '#lib/server/db';
import type { Kind } from '#lib/types';

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function readKind(raw: FormDataEntryValue | null): Kind | null {
	return raw === 'spend' || raw === 'income' || raw === 'save' ? raw : null;
}

/** 분류 검증 — 같은 종류의 categories 에 이름이 있어야 한다. 저축은 이름이 고정이다 */
export function readCategory(kind: Kind, raw: FormDataEntryValue | null): string | null {
	if (kind === 'save') return '저축';
	if (typeof raw !== 'string' || !raw) return null;
	return db.listCategories().some((c) => c.kind === kind && c.name === raw) ? raw : null;
}

export function readInt(raw: FormDataEntryValue | null): number | null {
	const n = Number(raw);
	return Number.isInteger(n) && n > 0 ? n : null;
}

/** 할부 개월 수 — 2~60 사이만 인정하고, 그 밖에는 일시불(1) */
export function readInstallments(raw: FormDataEntryValue | null): number {
	const n = readInt(raw);
	return n !== null && n >= 2 && n <= 60 ? n : 1;
}

/** 카드 결제일(1~31) — 비워 두면 null, 올바르지 않으면 undefined */
export function readPayDay(raw: FormDataEntryValue | null): number | null | undefined {
	const text = String(raw ?? '').trim();
	if (text === '') return null;
	const n = Number(text);
	return Number.isInteger(n) && n >= 1 && n <= 31 ? n : undefined;
}

/** 카드 이용기간 시작일(1~28) — 비워 두면 1일, 올바르지 않으면 undefined */
export function readCycleStart(raw: FormDataEntryValue | null): number | undefined {
	const text = String(raw ?? '').trim();
	if (text === '') return 1;
	const n = Number(text);
	return Number.isInteger(n) && n >= 1 && n <= 28 ? n : undefined;
}

/** 결제수단 — 선택하지 않으면 null, 선택하면 실존해야 한다 */
export function readMethodId(raw: FormDataEntryValue | null): number | null {
	const id = readInt(raw);
	if (id === null) return null;
	return db.listPaymentMethods().some((m) => m.id === id) ? id : null;
}

/** 입금될 통장 — 통장(account)만 받는다. 선택하지 않으면 null */
export function readAccountId(raw: FormDataEntryValue | null): number | null {
	const id = readInt(raw);
	if (id === null) return null;
	return db.listPaymentMethods().some((m) => m.id === id && m.kind === 'account') ? id : null;
}

/** 저축목표 — 선택하지 않으면 null, 선택하면 실존해야 한다 */
export function readGoalId(raw: FormDataEntryValue | null): number | null {
	const id = readInt(raw);
	if (id === null) return null;
	return db.listSavingsGoals().some((g) => g.id === id) ? id : null;
}

export function hasCategory(kind: 'spend' | 'income', name: string, exceptId?: number): boolean {
	return db.listCategories().some((c) => c.kind === kind && c.name === name && c.id !== exceptId);
}

export function hasMethod(kind: 'card' | 'account', name: string, exceptId?: number): boolean {
	return db
		.listPaymentMethods()
		.some((m) => m.kind === kind && m.name === name && m.id !== exceptId);
}

export function hasGoal(name: string, exceptId?: number): boolean {
	return db.listSavingsGoals().some((g) => g.name === name && g.id !== exceptId);
}
