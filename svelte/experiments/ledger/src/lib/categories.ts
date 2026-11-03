export interface CategoryInfo {
	name: string;
	color: string;
}

/** 지출 기본 분류 — 흰 바탕에서 구분되도록 채도를 맞춘 색 */
export const EXPENSE_CATEGORIES: CategoryInfo[] = [
	{ name: '식비', color: '#E8590C' },
	{ name: '교통', color: '#2B8A3E' },
	{ name: '카페', color: '#A0522D' },
	{ name: '쇼핑', color: '#D6336C' },
	{ name: '문화', color: '#3454D1' },
	{ name: '생활', color: '#0C8599' },
	{ name: '통신·구독', color: '#7048E8' },
	{ name: '기타', color: '#6B7280' }
];

/** 입금 분류 */
export const INCOME_CATEGORIES: string[] = ['월급', '용돈', '환급', '중고판매', '기타입금'];
export const INCOME_COLOR = '#0B8F66';

/** 저축 색 — UI 토큰은 layout.css 의 --color-save 와 같은 값을 유지한다 */
export const SAVE_COLOR = '#7048E8';

/** 분류 색상 선택지 */
export const COLOR_CHOICES: string[] = [
	'#E8590C',
	'#F08C00',
	'#2B8A3E',
	'#0B8F66',
	'#0C8599',
	'#3454D1',
	'#7048E8',
	'#D6336C',
	'#A0522D',
	'#6B7280'
];
