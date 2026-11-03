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

/** 결제수단 — 선택하지 않으면 null, 선택하면 실존해야 한다 */
export function readMethodId(raw: FormDataEntryValue | null): number | null {
	const id = readInt(raw);
	if (id === null) return null;
	return db.listPaymentMethods().some((m) => m.id === id) ? id : null;
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
