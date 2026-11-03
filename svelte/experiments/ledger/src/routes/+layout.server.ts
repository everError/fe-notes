import type { LayoutServerLoad } from './$types';
import { isValidMonth, monthKey, monthLabel } from '#lib/format';

/** 모든 화면이 공유하는 기준 달 — 주소의 ?m= 값을 쓰고, 없으면 이번 달 */
export const load: LayoutServerLoad = ({ url }) => {
	const now = new Date();
	const todayMonth = monthKey(now);
	const param = url.searchParams.get('m');
	const month = isValidMonth(param) ? param : todayMonth;
	return { month, monthLabel: monthLabel(month), todayMonth, todayDay: now.getDate() };
};
