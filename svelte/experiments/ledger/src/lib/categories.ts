export interface CategoryInfo {
	name: string;
	color: string;
}

/** 지출 기본 분류 — 흰 바탕에서 구분되도록 채도를 맞춘 색 */
export const EXPENSE_CATEGORIES: CategoryInfo[] = [
	{ name: '식비', color: '#D9731A' },
	{ name: '교통', color: '#2B8A3E' },
	{ name: '카페', color: '#A0522D' },
	{ name: '쇼핑', color: '#D6336C' },
	{ name: '문화', color: '#3F6FB5' },
	{ name: '생활', color: '#0C8599' },
	{ name: '통신·구독', color: '#8A4F9E' },
	{ name: '기타', color: '#6B7280' }
];

/** 입금 분류 */
export const INCOME_CATEGORIES: string[] = ['월급', '용돈', '환급', '중고판매', '기타입금'];
export const INCOME_COLOR = '#2E7D4F';

/** 저축 색 — UI 토큰은 layout.css 의 --color-save 와 같은 값을 유지한다 */
export const SAVE_COLOR = '#8A4F9E';

/** 분류 색상 선택지 */
export const COLOR_CHOICES: string[] = [
	'#D9731A',
	'#F08C00',
	'#2B8A3E',
	'#2E7D4F',
	'#0C8599',
	'#3F6FB5',
	'#8A4F9E',
	'#D6336C',
	'#A0522D',
	'#6B7280'
];
