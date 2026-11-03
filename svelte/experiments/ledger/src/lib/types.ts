export type Kind = 'spend' | 'income' | 'save';

export interface Entry {
	id: number;
	date: string; // YYYY-MM-DD
	kind: Kind;
	amount: number; // 원, 양수
	category: string;
	memo: string;
	source: string; // 'manual' | 'fixed:<defId>'
	methodId: number | null; // 결제수단(카드/통장)
	methodName: string | null;
	goalId: number | null; // 저축 목표
	goalName: string | null;
}

/** 사용자 관리 분류(기본 분류 포함) */
export interface Category {
	id: number;
	kind: 'spend' | 'income';
	name: string;
	color: string;
	builtin: boolean;
	position: number;
}

/** 카드·통장(지출 출처) */
export interface PaymentMethod {
	id: number;
	kind: 'card' | 'account';
	name: string;
	position: number;
}

export interface SavingsGoal {
	id: number;
	name: string;
	targetAmount: number;
	endMonth: string; // YYYY-MM
	position: number;
}

export interface SavingsGoalInfo extends SavingsGoal {
	saved: number; // 목표에 쌓인 합계(누적)
	progress: number; // 0~100
	monthlyNeeded: number; // 보고 있는 달에 모아야 할 금액(남은 금액 ÷ 남은 달)
}

export interface FixedDef {
	id: number;
	name: string;
	day: number; // 1~31
	amount: number;
	category: string;
}

export interface DayCell {
	date: string;
	day: number;
	entries: Entry[];
	spend: number;
	income: number;
	save: number;
	fixed: number; // 기록된 고정지출 합계
	alerts: { category: string; level: 'warn' | 'over' }[]; // 그날 예산 경고를 처음 넘은 분류
}

export interface RoutePoint {
	day: number;
	date: string;
	balance: number;
	hasFixed: boolean;
}

export interface CategorySlice {
	name: string;
	amount: number;
	color: string;
	fixedAmount: number; // 그 카테고리 중 고정지출 금액
}

export interface MethodSlice {
	id: number;
	name: string;
	kind: 'card' | 'account';
	amount: number;
}

/** 분류별 월 예산 사용 현황 */
export interface BudgetInfo {
	name: string;
	color: string;
	budget: number;
	spent: number;
	pct: number; // 사용률(%) — 100 을 넘을 수 있다
	level: 'ok' | 'warn' | 'over'; // 80% 이상 warn, 초과 over
}

/** 지난달 대비 — 이번 달은 지난달의 같은 기간만 집계한다 */
export interface MonthCompare {
	prevMonth: string;
	days: number; // 비교한 일 수(0 이면 비교 없음)
	prevSpendTotal: number;
	byCategory: { name: string; amount: number }[];
}

export interface MonthData {
	month: string; // YYYY-MM
	monthLabel: string; // 2026년 11월
	today: string;
	todayInMonth: boolean;
	daysInMonth: number;
	startAmount: number | null; // 미설정 = null
	entries: Entry[];
	fixedDefs: FixedDef[];
	recordedFixedIds: number[];
	spendTotal: number;
	incomeTotal: number;
	saveTotal: number;
	fixedTotal: number;
	balance: number | null; // 시작금액 미설정 = null
	byDay: DayCell[];
	route: RoutePoint[];
	byCategory: CategorySlice[];
	byMethod: MethodSlice[];
	categories: Category[];
	paymentMethods: PaymentMethod[];
	savingsGoals: SavingsGoalInfo[];
	budgets: BudgetInfo[];
	compare: MonthCompare;
	prevBalance: number | null; // 지난달 마감 잔액(지난달 시작금액이 없으면 null)
	monthSavePlan: number; // 보고 있는 달에 모아야 할 저축 합계(목표별 필요액의 합)
	selectedDay: number;
	selectedDate: string;
	selectedEntries: Entry[];
}
