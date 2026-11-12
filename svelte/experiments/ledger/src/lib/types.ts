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
	installments: number; // 카드 할부 개월 수 (일시불 = 1)
}

export type Nature = 'consume' | 'bill';

/** 사용자 관리 분류(기본 분류 포함) */
export interface Category {
	id: number;
	kind: 'spend' | 'income';
	name: string;
	color: string;
	builtin: boolean;
	nature: Nature; // 지출 분류의 성격 — 소비 / 공과금
	position: number;
}

/** 카드·통장(지출 출처) */
export interface PaymentMethod {
	id: number;
	kind: 'card' | 'account';
	name: string;
	position: number;
	payDay: number | null; // 카드 결제일(매달 N일) — 안 정했으면 null
	cycleStart: number; // 카드 이용기간 시작일(매달 N일부터 다음 달 N-1일까지) — 기본 1
}

export interface SavingsGoal {
	id: number;
	name: string;
	targetAmount: number;
	endMonth: string; // YYYY-MM
	position: number;
	initialAmount: number; // 기록을 시작하기 전에 이미 모아 둔 기존 저축금액
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
	methodId: number | null; // 이 고정지출을 내는 카드·통장
	methodName: string | null;
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

/** 카드대금 결제 — 통장에서 카드로 돈이 옮겨간 기록 */
export interface CardPayment {
	id: number;
	date: string;
	cardId: number;
	cardName: string;
	accountId: number;
	accountName: string;
	amount: number;
}

/** 카드 청구 현황 — 결제일 기준으로 이번에 낼 돈과 그 뒤에 낼 돈 */
export interface CardBill {
	month: string; // 다음 결제가 있는 달
	payDay: number | null;
	periodFrom: string; // 이번 결제에 청구되는 이용기간 (YYYY-MM-DD)
	periodTo: string;
	nextMonth: string; // 그다음 결제가 있는 달
	next: number; // 그다음 결제에 청구될 금액(지금까지 쌓인 사용분 + 할부)
	nextFrom: string; // 그다음 결제의 이용기간
	nextTo: string;
	carry: number; // 기록해 둔 월초 미결제 금액
	adjust: number; // 명세서에 맞춰 늘리거나 줄인 금액(늘림 +, 줄임 −)
	usage: number; // 일시불 사용분
	installment: number; // 이번 결제에 들어가는 할부 납입분
	paid: number; // 이미 결제한 금액
	due: number; // 이번 결제 예정액
	dueRaw: number; // 미리 낸 금액까지 그대로 뺀 값 — 명세서 금액에 맞출 때의 기준
	later: number; // 이번 결제 이후로 남은 금액(다음 달 사용분 + 남은 할부)
	installLeft: number; // 앞으로 낼 남은 할부 금액
}

export interface CardDebt {
	id: number;
	name: string;
	payDay: number | null;
	cycleStart: number;
	start: number; // 월초 미결제 금액(이전 달에서 이어진 값)
	spent: number; // 이번 달 카드 지출(할부는 전체 금액)
	paid: number; // 이번 달 결제한 금액
	adjusted: number; // 이번 달 명세서에 맞춰 조정한 금액(늘림 +, 줄임 −)
	owed: number; // 지금까지 결제하지 못한 전체 금액
	bill: CardBill;
}

/** 카드 금액 조정 — 명세서와 달라진 만큼 카드 미결제 금액을 늘리거나(+) 줄인(−) 기록 */
export interface CardAdjustment {
	id: number;
	date: string;
	cardId: number;
	cardName: string;
	amount: number; // 늘림 +, 줄임 −
	memo: string;
}

/** 송금 — 통장에서 통장으로 돈이 옮겨간 기록 */
export interface Transfer {
	id: number;
	date: string;
	fromId: number;
	fromName: string;
	toId: number;
	toName: string;
	amount: number;
}

export interface MonthData {
	month: string; // YYYY-MM
	monthLabel: string; // 2026년 11월
	today: string;
	todayInMonth: boolean;
	daysInMonth: number;
	startAmount: number | null; // 통장별 월초 잔액의 합 — 미설정 = null
	accountBalances: { id: number; name: string; amount: number; current: number; recorded: boolean }[]; // 통장별 월초(이전 달에서 이어진 값)·현재 잔액
	unassignedNet: number; // 통장을 지정하지 않은 입금·지출과 저축의 누적 합(기록 시작 이후)
	transfers: Transfer[]; // 이번 달 송금
	byNature: { consume: number; bill: number }; // 이번 달 지출을 분류 성격별로 나눈 합
	cardDebts: CardDebt[]; // 카드별 미결제 금액
	cardPayments: CardPayment[]; // 이번 달 카드대금 결제(통장 → 카드)
	cardAdjustments: CardAdjustment[]; // 이번 달 카드 금액 조정
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

/** 카드 청구 일정의 한 달치 */
export interface CardScheduleItem {
	month: string; // 결제하는 달
	amount: number;
	from: string; // 이용기간
	to: string;
}

/** 카드 한 장의 결제 계획 */
export interface CardPlan {
	id: number;
	name: string;
	payDay: number | null;
	cycleStart: number;
	owed: number; // 아직 결제하지 않은 전체 금액
	due: number; // 다음 결제일에 낼 금액
	dueRaw: number; // 미리 낸 금액까지 그대로 뺀 값(0보다 작으면 미리 낸 금액이 더 있다는 뜻)
	dueMonth: string;
	schedule: CardScheduleItem[]; // 앞으로의 청구 일정
}

/** 진행 중인 할부 */
export interface InstallmentInfo {
	id: number; // 내역 id
	date: string;
	memo: string;
	category: string;
	cardId: number;
	cardName: string;
	total: number;
	months: number;
	billedCount: number; // 이번 결제까지 청구된 회차
	monthly: number;
	remainingAmount: number; // 이번 결제 이후로 남은 금액
	lastMonth: string; // 마지막 청구 달
}

export interface AssetsData {
	today: string;
	accounts: { id: number; name: string; current: number }[];
	accountTotal: number;
	cardOwedTotal: number;
	net: number; // 통장 합계 − 카드 미결제
	cards: CardPlan[];
	installments: InstallmentInfo[];
	timeline: {
		month: string;
		total: number;
		items: { cardId: number; name: string; amount: number; payDay: number | null }[];
		after: number; // 그 달까지 카드대금을 모두 낸 뒤 남는 통장 합계
	}[];
}

export interface TrendRow {
	month: string;
	income: number;
	spend: number;
	save: number;
	fixed: number;
	cardPaid: number;
}

export interface CategoryYear {
	year: number;
	rows: { name: string; color: string; nature: Nature; months: number[]; total: number }[];
	monthTotals: number[];
}
