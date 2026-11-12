const nf = new Intl.NumberFormat('ko-KR');

/** 1234560 -> '1,234,560' */
export function num(n: number): string {
	return nf.format(n);
}

/** 지출·입금 표기: +35,000 / -4,500 */
export function signed(n: number): string {
	if (n > 0) return `+${nf.format(n)}`;
	if (n < 0) return `-${nf.format(-n)}`;
	return '0';
}

/** 입력값에서 금액 파싱: '12,500원' -> 12500 */
export function parseAmount(raw: FormDataEntryValue | null | undefined): number {
	if (typeof raw !== 'string') return NaN;
	const digits = raw.replace(/[^\d]/g, '');
	if (!digits) return NaN;
	return Number(digits);
}

export function pad2(n: number): string {
	return n < 10 ? `0${n}` : `${n}`;
}

/** Date -> 'YYYY-MM-DD' (로컬 기준) */
export function dateKey(d: Date): string {
	return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Date -> 'YYYY-MM' (로컬 기준) */
export function monthKey(d: Date): string {
	return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

export function isValidMonth(s: string | null): s is string {
	return !!s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

/** '2026-11' -> '2026년 11월' */
export function monthLabel(month: string): string {
	const [y, m] = month.split('-');
	return `${y}년 ${Number(m)}월`;
}

export function daysInMonthOf(month: string): number {
	const [y, m] = month.split('-').map(Number);
	return new Date(y, m, 0).getDate();
}

/** 그 달 1일의 요일(0=일) */
export function firstWeekdayOf(month: string): number {
	const [y, m] = month.split('-').map(Number);
	return new Date(y, m - 1, 1).getDay();
}

export function addMonths(month: string, delta: number): string {
	const [y, m] = month.split('-').map(Number);
	const d = new Date(y, m - 1 + delta, 1);
	return monthKey(d);
}

/** '2026-11-05' -> '11월 5일' */
export function dayLabel(date: string): string {
	const [, m, d] = date.split('-').map(Number);
	return `${m}월 ${d}일`;
}

export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function weekdayOf(date: string): string {
	const [y, m, d] = date.split('-').map(Number);
	return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}

/** 좁은 칸용 금액 표기: 12,500 -> '1.3만', 3,100,000 -> '310만', 800 -> '800' */
export function compact(n: number): string {
	const abs = Math.abs(n);
	if (abs >= 100_000_000) return `${trim1(abs / 100_000_000)}억`;
	if (abs >= 10_000) return `${trim1(abs / 10_000)}만`;
	return nf.format(abs);
}

function trim1(v: number): string {
	return (v >= 100 ? Math.round(v) : Math.round(v * 10) / 10).toString();
}

/** 두 달 키 사이의 개월 수: monthsBetween('2026-11', '2027-03') === 4 */
export function monthsBetween(from: string, to: string): number {
	const [fy, fm] = from.split('-').map(Number);
	const [ty, tm] = to.split('-').map(Number);
	return (ty - fy) * 12 + (tm - fm);
}

/** 카드 청구 주기 설명 — 예: '매달 2일 ~ 다음 달 1일 사용분 → 다음 달 15일 결제' */
export function cycleText(cycleStart: number, payDay: number | null): string {
	const range =
		cycleStart === 1 ? '매달 1일 ~ 말일 사용분' : `매달 ${cycleStart}일 ~ 다음 달 ${cycleStart - 1}일 사용분`;
	if (payDay === null) return range;
	const rel = cycleStart === 1 || payDay > cycleStart - 1 ? '다음 달' : '다다음 달';
	return `${range} → ${rel} ${payDay}일 결제`;
}

/** '2026-11-03' -> '11/3' */
export function md(date: string): string {
	return date ? `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}` : '';
}
