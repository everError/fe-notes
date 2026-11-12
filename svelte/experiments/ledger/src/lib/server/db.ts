import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {
	addMonths,
	dateKey,
	daysInMonthOf,
	monthKey,
	monthLabel,
	monthsBetween,
	pad2
} from '#lib/format';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, INCOME_COLOR } from '#lib/categories';
import type {
	Nature,
	Category,
	BudgetInfo,
	AssetsData,
	CardAdjustment,
	CardPlan,
	CardScheduleItem,
	CategoryYear,
	InstallmentInfo,
	TrendRow,
	CardBill,
	CardDebt,
	CardPayment,
	Transfer,
	CategorySlice,
	DayCell,
	Entry,
	FixedDef,
	Kind,
	MethodSlice,
	MonthCompare,
	MonthData,
	PaymentMethod,
	RoutePoint,
	SavingsGoal,
	SavingsGoalInfo
} from '#lib/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = process.env.LEDGER_DB ?? path.join(DATA_DIR, 'ledger.db');

let db: DatabaseSync;

/** 쓰던 DB 는 구조를 바꾸기 전에 한 번 통째로 복사해 둔다(data/backups) */
function backupOnce(db: DatabaseSync): void {
	const marker = path.join(path.dirname(DB_PATH), '.backup-ledger-v4');
	if (fs.existsSync(marker)) return;
	try {
		const dir = path.join(path.dirname(DB_PATH), 'backups');
		fs.mkdirSync(dir, { recursive: true });
		const stamp = new Date().toISOString().replace(/[:.]/g, '-');
		const target = path.join(dir, `ledger-before-v4-${stamp}.db`).replace(/'/g, "''");
		db.exec(`VACUUM INTO '${target}'`);
		fs.writeFileSync(marker, stamp);
	} catch (err) {
		console.error('DB 백업에 실패했어요', err);
	}
}

function getDb(): DatabaseSync {
	if (db) return db;
	fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
	const existed = fs.existsSync(DB_PATH);
	db = new DatabaseSync(DB_PATH);
	if (existed) backupOnce(db);
	db.exec('PRAGMA journal_mode = WAL');
	db.exec(`
		CREATE TABLE IF NOT EXISTS month_start (
			month TEXT PRIMARY KEY,
			amount INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS entries (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			date TEXT NOT NULL,
			kind TEXT NOT NULL CHECK (kind IN ('spend','income')),
			amount INTEGER NOT NULL,
			category TEXT NOT NULL,
			memo TEXT NOT NULL DEFAULT '',
			source TEXT NOT NULL DEFAULT 'manual'
		);
		CREATE INDEX IF NOT EXISTS idx_entries_date ON entries (date);
		CREATE TABLE IF NOT EXISTS fixed_defs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			day INTEGER NOT NULL CHECK (day BETWEEN 1 AND 31),
			amount INTEGER NOT NULL,
			category TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS fixed_log (
			def_id INTEGER NOT NULL REFERENCES fixed_defs (id) ON DELETE CASCADE,
			month TEXT NOT NULL,
			entry_id INTEGER NOT NULL,
			PRIMARY KEY (def_id, month)
		);
	`);
	migrate(db);
	return db;
}

/* ------------------------------------------------------------------ */
/* 마이그레이션 — 기존 DB에 새 테이블·컬럼을 넣는다(각각 한 번만)        */
/* ------------------------------------------------------------------ */

const DEFAULT_METHODS: { kind: 'card' | 'account'; name: string }[] = [
	{ kind: 'card', name: '메인 카드' },
	{ kind: 'card', name: '캐시백 카드' },
	{ kind: 'account', name: '입출금 통장' },
	{ kind: 'account', name: '적금 통장' }
];

function migrate(db: DatabaseSync): void {
	// 새 테이블(없으면 만드는 식이라 언제든 다시 실행 가능)
	db.exec(`
		CREATE TABLE IF NOT EXISTS categories (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			kind TEXT NOT NULL CHECK (kind IN ('spend','income')),
			name TEXT NOT NULL,
			color TEXT NOT NULL,
			builtin INTEGER NOT NULL DEFAULT 0,
			position INTEGER NOT NULL DEFAULT 0,
			UNIQUE (kind, name)
		);
		CREATE TABLE IF NOT EXISTS payment_methods (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			kind TEXT NOT NULL CHECK (kind IN ('card','account')),
			name TEXT NOT NULL,
			position INTEGER NOT NULL DEFAULT 0,
			UNIQUE (kind, name)
		);
		CREATE TABLE IF NOT EXISTS category_budgets (
			category TEXT PRIMARY KEY,
			amount INTEGER NOT NULL CHECK (amount > 0)
		);
		CREATE TABLE IF NOT EXISTS account_balances (
			month TEXT NOT NULL,
			method_id INTEGER NOT NULL,
			amount INTEGER NOT NULL,
			PRIMARY KEY (month, method_id)
		);
		CREATE TABLE IF NOT EXISTS card_payments (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			date TEXT NOT NULL,
			card_id INTEGER NOT NULL,
			account_id INTEGER NOT NULL,
			amount INTEGER NOT NULL CHECK (amount > 0)
		);
		CREATE TABLE IF NOT EXISTS savings_goals (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			target_amount INTEGER NOT NULL,
			end_month TEXT NOT NULL,
			position INTEGER NOT NULL DEFAULT 0,
			UNIQUE (name)
		);
	`);
	// entries에 'save' kind와 goal_id·method_id가 없으면 테이블 재빌드
	const entrySql =
		(
			db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='entries'").get() as
				{ sql: string } | undefined
		)?.sql ?? '';
	if (!entrySql.includes("'save'")) {
		db.exec(`
			BEGIN;
			CREATE TABLE entries_new (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				date TEXT NOT NULL,
				kind TEXT NOT NULL CHECK (kind IN ('spend','income','save')),
				amount INTEGER NOT NULL,
				category TEXT NOT NULL,
				memo TEXT NOT NULL DEFAULT '',
				source TEXT NOT NULL DEFAULT 'manual',
				goal_id INTEGER,
				method_id INTEGER
			);
			INSERT INTO entries_new (id, date, kind, amount, category, memo, source)
				SELECT id, date, kind, amount, category, memo, source FROM entries;
			DROP TABLE entries;
			ALTER TABLE entries_new RENAME TO entries;
			COMMIT;
		`);
	}
	db.exec('CREATE INDEX IF NOT EXISTS idx_entries_date ON entries (date);');
	db.exec(`
		CREATE TABLE IF NOT EXISTS card_adjustments (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			date TEXT NOT NULL,
			card_id INTEGER NOT NULL,
			amount INTEGER NOT NULL CHECK (amount <> 0),
			memo TEXT NOT NULL DEFAULT ''
		);
		CREATE TABLE IF NOT EXISTS transfers (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			date TEXT NOT NULL,
			from_id INTEGER NOT NULL,
			to_id INTEGER NOT NULL,
			amount INTEGER NOT NULL CHECK (amount > 0)
		);
	`);
	const entryCols = db.prepare('PRAGMA table_info(entries)').all() as unknown as { name: string }[];
	if (!entryCols.some((c) => c.name === 'installments'))
		db.exec('ALTER TABLE entries ADD COLUMN installments INTEGER NOT NULL DEFAULT 1');
	const methodCols = db.prepare('PRAGMA table_info(payment_methods)').all() as unknown as {
		name: string;
	}[];
	if (!methodCols.some((c) => c.name === 'pay_day'))
		db.exec('ALTER TABLE payment_methods ADD COLUMN pay_day INTEGER');
	if (!methodCols.some((c) => c.name === 'cycle_start'))
		db.exec('ALTER TABLE payment_methods ADD COLUMN cycle_start INTEGER NOT NULL DEFAULT 1');
	const fixedCols = db.prepare('PRAGMA table_info(fixed_defs)').all() as unknown as { name: string }[];
	if (!fixedCols.some((c) => c.name === 'method_id'))
		db.exec('ALTER TABLE fixed_defs ADD COLUMN method_id INTEGER');
	const goalCols = db.prepare('PRAGMA table_info(savings_goals)').all() as unknown as {
		name: string;
	}[];
	if (!goalCols.some((c) => c.name === 'initial_amount'))
		db.exec('ALTER TABLE savings_goals ADD COLUMN initial_amount INTEGER NOT NULL DEFAULT 0');
	// 분류의 성격(소비/공과금) 컬럼 — 기존 DB에는 한 번만 추가한다
	const catCols = db.prepare('PRAGMA table_info(categories)').all() as unknown as { name: string }[];
	if (!catCols.some((c) => c.name === 'nature')) {
		db.exec("ALTER TABLE categories ADD COLUMN nature TEXT NOT NULL DEFAULT 'consume'");
		db.exec("UPDATE categories SET nature = 'bill' WHERE kind = 'spend' AND name = '통신·구독' AND builtin = 1");
	}
}

/** 기본 카테고리·결제수단·목표를 채운다(없는 것만 — 신규 시드와 기존 DB 모두에서 안전) */
export function ensureBuiltinData(withSamples = true): void {
	const db = getDb();
	const insCat = db.prepare(
		'INSERT INTO categories (kind, name, color, builtin, position, nature) VALUES (?, ?, ?, 1, ?, ?)'
	);
	// 기본 분류의 색은 코드의 정의를 따른다(사용자가 만든 분류는 건드리지 않는다)
	const syncColor = db.prepare(
		'UPDATE categories SET color = ? WHERE kind = ? AND name = ? AND builtin = 1'
	);
	let pos = 0;
	for (const c of EXPENSE_CATEGORIES) {
		const r = db.prepare('SELECT 1 FROM categories WHERE kind=? AND name=?').get('spend', c.name);
		if (!r) insCat.run('spend', c.name, c.color, pos++, c.nature ?? 'consume');
		else syncColor.run(c.color, 'spend', c.name);
	}
	pos = 0;
	for (const n of INCOME_CATEGORIES) {
		const r = db.prepare('SELECT 1 FROM categories WHERE kind=? AND name=?').get('income', n);
		if (!r) insCat.run('income', n, INCOME_COLOR, pos++, 'consume');
		else syncColor.run(INCOME_COLOR, 'income', n);
	}
	if (!withSamples) return;
	const insMethod = db.prepare(
		'INSERT INTO payment_methods (kind, name, position) VALUES (?, ?, ?)'
	);
	DEFAULT_METHODS.forEach((m, i) => {
		const r = db
			.prepare('SELECT 1 FROM payment_methods WHERE kind=? AND name=?')
			.get(m.kind, m.name);
		if (!r) insMethod.run(m.kind, m.name, i);
	});
	const insGoal = db.prepare(
		'INSERT INTO savings_goals (name, target_amount, end_month, position) VALUES (?, ?, ?, ?)'
	);
	const endY = new Date().getFullYear() + 1;
	if (!db.prepare('SELECT 1 FROM savings_goals WHERE name=?').get('비상금'))
		insGoal.run('비상금', 5_000_000, `${endY}-06`, 0);
	if (!db.prepare('SELECT 1 FROM savings_goals WHERE name=?').get('여행 기금'))
		insGoal.run('여행 기금', 1_500_000, `${endY}-03`, 1);
}

/* ------------------------------------------------------------------ */
/* 시드 (예시 데이터)                                                   */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number) {
	let a = seed;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const rand = mulberry32(20261103);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

const LUNCH = ['도시락', '회사 앞 김밥', '부대찌개', '샐러드', '닭가슴살 도시락', '직원 식당'];
const DINNER = ['마라탕', '칼국수', '삼겹살', '페페로니 피자', '김치찜', '쌀국수', '초밥'];
const CAFE = ['아이스 아메리카노', '딸기 라떼', '카페라떼', '손님 초대 커피'];
const FUN = ['영화 관람', '넷플릭스 대체 전시회', '아케이드', '볼링', '공연 티켓'];
const SHOP = ['여름 티셔츠', '운동화', '주방 정리 용품', '책상 스탠드', '이어폰 케이스'];
const MART = ['마트 장보기', '생수 12팩', '세제·휴지', '과일 박스'];

function insertEntry(
	date: string,
	kind: 'spend' | 'income' | 'save',
	amount: number,
	category: string,
	memo: string,
	source = 'manual',
	methodId: number | null = null,
	goalId: number | null = null
): void {
	getDb()
		.prepare(
			'INSERT INTO entries (date, kind, amount, category, memo, source, method_id, goal_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
		)
		.run(date, kind, amount, category, memo, source, methodId, goalId);
}

function seed(): void {
	const db = getDb();
	db.exec(
		'DELETE FROM fixed_log; DELETE FROM entries; DELETE FROM fixed_defs; DELETE FROM month_start; DELETE FROM account_balances; DELETE FROM card_payments; DELETE FROM card_adjustments; DELETE FROM transfers;'
	);
	db.exec(
		'DELETE FROM categories; DELETE FROM payment_methods; DELETE FROM savings_goals; DELETE FROM category_budgets;'
	);
	ensureBuiltinData();
	// 예시 예산 — 식비·카페
	setBudget('식비', 400_000);
	setBudget('카페', 80_000);

	const today = new Date();
	const nowMonth = monthKey(today);
	const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
	const prevMonth = monthKey(prevMonthDate);
	const nowDay = today.getDate();

	// 월 시작금액
	// 결제수단 — 지출 시 카드 70% / 통장 30%
	const cards = (
		db
			.prepare("SELECT id FROM payment_methods WHERE kind='card' ORDER BY position, id")
			.all() as unknown as {
			id: number;
		}[]
	).map((r) => r.id);
	const accounts = (
		db
			.prepare("SELECT id FROM payment_methods WHERE kind='account' ORDER BY position, id")
			.all() as unknown as {
			id: number;
		}[]
	).map((r) => r.id);
	const pickSpendMethod = () => {
		const pool = rand() < 0.7 && cards.length > 0 ? cards : accounts;
		return pool.length > 0 ? pool[Math.floor(rand() * pool.length)] : null;
	};
	const savingsAccount = accounts[accounts.length - 1] ?? null;
	// 통장별 월초 잔액 — 입출금 통장 / 적금 통장
	const balances: [string, number[]][] = [
		[prevMonth, [1_850_000, 600_000]],
		[nowMonth, [2_000_000, 1_100_000]]
	];
	for (const [month, amounts] of balances)
		accounts.forEach((id, i) => {
			if (amounts[i] !== undefined) setAccountBalance(month, id, amounts[i]);
		});
	// 카드 월초 미결제 금액 — 지난달 쓴 카드대금을 이번 달 1일에 입출금 통장에서 결제한다
	if (cards[0] !== undefined) {
		setAccountBalance(prevMonth, cards[0], 250_000);
		setAccountBalance(nowMonth, cards[0], 300_000);
		if (accounts[0] !== undefined) {
			addCardPayment(`${prevMonth}-10`, cards[0], accounts[0], 250_000);
			addCardPayment(`${nowMonth}-01`, cards[0], accounts[0], 300_000);
		}
	}
	const goalRows = db
		.prepare('SELECT id, name FROM savings_goals ORDER BY position, id')
		.all() as unknown as {
		id: number;
		name: string;
	}[];
	const goalByName = (name: string) => goalRows.find((g) => g.name === name)?.id ?? null;
	const emergencyGoal = goalByName('비상금');
	const travelGoal = goalByName('여행 기금');

	// 고정지출 정의
	db.prepare('INSERT INTO fixed_defs (name, day, amount, category) VALUES (?, ?, ?, ?)').run(
		'월세',
		5,
		650_000,
		'생활'
	);
	db.prepare('INSERT INTO fixed_defs (name, day, amount, category) VALUES (?, ?, ?, ?)').run(
		'휴대폰 요금',
		7,
		59_000,
		'통신·구독'
	);
	db.prepare('INSERT INTO fixed_defs (name, day, amount, category) VALUES (?, ?, ?, ?)').run(
		'넷플릭스',
		12,
		17_000,
		'통신·구독'
	);
	db.prepare('INSERT INTO fixed_defs (name, day, amount, category) VALUES (?, ?, ?, ?)').run(
		'헬스장',
		15,
		55_000,
		'생활'
	);

	// 각 달 기입: 이전 달은 전체, 이번 달은 어제까지
	const months: { month: string; lastDay: number }[] = [
		{ month: prevMonth, lastDay: daysInMonthOf(prevMonth) },
		{ month: nowMonth, lastDay: nowDay }
	];

	for (const { month, lastDay } of months) {
		if (lastDay < 1) continue;
		const [y, m] = month.split('-').map(Number);

		// 저축 — 1일에 비상금 50만원 자동이체, 26일에 월급 들어온 뒤 여행 기금 30만원
		if (lastDay >= 1 && emergencyGoal !== null) {
			insertEntry(
				`${month}-01`,
				'save',
				500_000,
				'저축',
				'비상금 이체',
				'manual',
				savingsAccount,
				emergencyGoal
			);
		}
		if (lastDay >= 26 && travelGoal !== null) {
			insertEntry(
				`${month}-26`,
				'save',
				300_000,
				'저축',
				'여행 기금 이체',
				'manual',
				savingsAccount,
				travelGoal
			);
		}

		// 월급은 25일 입금 — 지나온 날(어제까지)에 있으면 기입
		if (lastDay >= 25) {
			insertEntry(`${month}-25`, 'income', 3_100_000, '월급', '월급 입금', 'manual', accounts[0] ?? null);
		}
		if (month === nowMonth && lastDay >= 2) {
			insertEntry(`${month}-02`, 'income', 200_000, '용돈', '부모님 용돈', 'manual', accounts[0] ?? null);
		}
		if (month === nowMonth && lastDay >= 8) {
			insertEntry(`${month}-08`, 'income', 63_000, '환급', '연말정산 환급', 'manual', accounts[0] ?? null);
		}

		for (let d = 1; d <= lastDay; d++) {
			const date = `${month}-${pad2(d)}`;
			const wd = new Date(y, m - 1, d).getDay();

			// 평일 점심(회사 지출)
			if (wd >= 1 && wd <= 5 && rand() < 0.85) {
				insertEntry(
					date,
					'spend',
					between(8_000, 13_000),
					'식비',
					pick(LUNCH),
					'manual',
					pickSpendMethod()
				);
			}
			// 저녁 — 주 4~6회
			if (rand() < 0.62) {
				insertEntry(
					date,
					'spend',
					between(7_000, 24_000),
					'식비',
					pick(DINNER),
					'manual',
					pickSpendMethod()
				);
			}
			// 카페 — 주 2~3회
			if (rand() < 0.32) {
				insertEntry(
					date,
					'spend',
					between(4_200, 6_800),
					'카페',
					pick(CAFE),
					'manual',
					pickSpendMethod()
				);
			}
			// 교통 — 주 2~3회
			if (rand() < 0.4) {
				insertEntry(
					date,
					'spend',
					between(1_450, 3_600),
					'교통',
					rand() < 0.5 ? '지하철' : '버스',
					'manual',
					pickSpendMethod()
				);
			}
			// 주말 문화
			if ((wd === 0 || wd === 6) && rand() < 0.45) {
				insertEntry(
					date,
					'spend',
					between(12_000, 38_000),
					'문화',
					pick(FUN),
					'manual',
					pickSpendMethod()
				);
			}
			// 쇼핑 — 달에 3회 정도
			if (d % 9 === 4 && rand() < 0.75) {
				insertEntry(
					date,
					'spend',
					between(18_000, 79_000),
					'쇼핑',
					pick(SHOP),
					'manual',
					pickSpendMethod()
				);
			}
			// 마트 — 8일/22일 근처
			if ((d === 8 || d === 22) && lastDay >= d) {
				insertEntry(
					date,
					'spend',
					between(15_000, 48_000),
					'생활',
					pick(MART),
					'manual',
					pickSpendMethod()
				);
			}
		}

		// 지정일이 지난 고정지출은 사용내역에 기록
		const defs = db.prepare('SELECT * FROM fixed_defs ORDER BY id').all() as unknown as FixedDef[];
		for (const def of defs) {
			if (def.day <= lastDay) {
				const day = Math.min(def.day, daysInMonthOf(month));
				const res = db
					.prepare(
						'INSERT INTO entries (date, kind, amount, category, memo, source, method_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
					)
					.run(
						`${month}-${pad2(day)}`,
						'spend',
						def.amount,
						def.category,
						def.name,
						`fixed:${def.id}`,
						pickSpendMethod()
					);
				db.prepare('INSERT INTO fixed_log (def_id, month, entry_id) VALUES (?, ?, ?)').run(
					def.id,
					month,
					Number(res.lastInsertRowid)
				);
			}
		}
	}
}

let seedPromise: Promise<void> | null = null;

/** 첫 요청에서 예시 데이터가 없으면 채운다 */
export async function ensureSeeded(): Promise<void> {
	seedPromise ??= new Promise<void>((resolve, reject) => {
		try {
			const db = getDb();
			// user_version 이 0 이면 아직 한 번도 초기화되지 않은 DB — 이후에는 비워도 다시 채우지 않는다
			const ver = db.prepare('PRAGMA user_version').get() as { user_version: number };
			if (ver.user_version === 0) {
				const row = db.prepare('SELECT COUNT(*) AS n FROM entries').get() as { n: number };
				if (row.n === 0) seed();
				else ensureBuiltinData();
				db.exec('PRAGMA user_version = 1');
			} else {
				ensureBuiltinData(false);
			}
			resolve();
		} catch (err) {
			reject(err);
		}
	});
	return seedPromise;
}

/** 기록과 설정을 모두 지운다 — 기본 분류만 남기고 예시 데이터는 다시 만들지 않는다 */
export function clearAll(): void {
	const db = getDb();
	db.exec(`
		DELETE FROM fixed_log; DELETE FROM entries; DELETE FROM fixed_defs; DELETE FROM month_start;
		DELETE FROM account_balances; DELETE FROM card_payments; DELETE FROM card_adjustments; DELETE FROM transfers; DELETE FROM category_budgets; DELETE FROM savings_goals; DELETE FROM payment_methods;
		DELETE FROM categories WHERE builtin = 0;
	`);
	ensureBuiltinData(false);
	db.exec('PRAGMA user_version = 1');
}

/* ------------------------------------------------------------------ */
/* 질의                                                                 */
/* ------------------------------------------------------------------ */

function monthBounds(month: string): [string, string] {
	return [`${month}-01`, `${month}-${pad2(daysInMonthOf(month))}`];
}

/** 통장별 월초 잔액을 기록한다 — amount 가 null 이면 기록을 지운다 */
export function setAccountBalance(month: string, methodId: number, amount: number | null): void {
	const db = getDb();
	if (amount === null) {
		db.prepare('DELETE FROM account_balances WHERE month = ? AND method_id = ?').run(month, methodId);
		return;
	}
	db.prepare(
		'INSERT INTO account_balances (month, method_id, amount) VALUES (?, ?, ?) ON CONFLICT(month, method_id) DO UPDATE SET amount = excluded.amount'
	).run(month, methodId, amount);
}

export function addCardPayment(
	date: string,
	cardId: number,
	accountId: number,
	amount: number
): number {
	const res = getDb()
		.prepare('INSERT INTO card_payments (date, card_id, account_id, amount) VALUES (?, ?, ?, ?)')
		.run(date, cardId, accountId, amount);
	return Number(res.lastInsertRowid);
}

/** 명세서에 맞춰 카드 미결제 금액을 늘리거나(+) 줄인다(−) */
export function addCardAdjustment(date: string, cardId: number, amount: number, memo: string): number {
	const res = getDb()
		.prepare('INSERT INTO card_adjustments (date, card_id, amount, memo) VALUES (?, ?, ?, ?)')
		.run(date, cardId, amount, memo);
	return Number(res.lastInsertRowid);
}

/** asOf 날짜 기준으로 다음 결제일에 낼 금액(이번 결제 예정액) — 카드가 없으면 null */
export function cardDueAt(cardId: number, asOf: string): number | null {
	const card = listPaymentMethods().find((m) => m.id === cardId && m.kind === 'card');
	return card ? cardBilling(loadLedger(), card, asOf).dueRaw : null;
}

export function deleteCardAdjustment(id: number): void {
	getDb().prepare('DELETE FROM card_adjustments WHERE id = ?').run(id);
}

export function deleteCardPayment(id: number): void {
	getDb().prepare('DELETE FROM card_payments WHERE id = ?').run(id);
}

/* ------------------------------------------------------------------ */
/* 통장·카드 잔액 — 달이 바뀌어도 이어지는 하나의 장부                     */
/* ------------------------------------------------------------------ */

/** 결제수단별로 달마다 쌓이는 증감(통장: 입금 +, 지출·카드대금·송금 − / 카드: 사용 +, 결제 −) */
interface Ledger {
	deltas: Map<number, Map<string, number>>;
	anchors: Map<number, [string, number][]>; // 직접 기록한 월초 잔액(달 순서)
	unassigned: Map<string, number>; // 통장을 지정하지 않은 입금(+)·지출(−)과 저축(−)
	firstAnchor: string | null; // 가장 처음 잔액을 기록한 달 — 이 달부터 장부를 이어간다
}

function loadLedger(): Ledger {
	const db = getDb();
	const kindOf = new Map(listPaymentMethods().map((m) => [m.id, m.kind]));
	const deltas = new Map<number, Map<string, number>>();
	const unassigned = new Map<string, number>();
	const add = (id: number, mon: string, v: number) => {
		let m = deltas.get(id);
		if (!m) deltas.set(id, (m = new Map()));
		m.set(mon, (m.get(mon) ?? 0) + v);
	};
	const addU = (mon: string, v: number) => unassigned.set(mon, (unassigned.get(mon) ?? 0) + v);

	const entryRows = db
		.prepare(
			'SELECT method_id, kind, substr(date, 1, 7) AS mon, SUM(amount) AS s FROM entries GROUP BY method_id, kind, substr(date, 1, 7)'
		)
		.all() as unknown as { method_id: number | null; kind: Kind; mon: string; s: number }[];
	for (const r of entryRows) {
		const k = r.method_id === null ? undefined : kindOf.get(r.method_id);
		if (r.kind === 'save') {
			if (k === 'account') add(r.method_id!, r.mon, -r.s);
			else addU(r.mon, -r.s);
		}
		else if (r.kind === 'spend') {
			if (k) add(r.method_id!, r.mon, k === 'account' ? -r.s : r.s);
			else addU(r.mon, -r.s);
		} else if (k === 'account') add(r.method_id!, r.mon, r.s);
		else addU(r.mon, r.s);
	}
	for (const r of db
		.prepare(
			'SELECT card_id, account_id, substr(date, 1, 7) AS mon, SUM(amount) AS s FROM card_payments GROUP BY card_id, account_id, substr(date, 1, 7)'
		)
		.all() as unknown as { card_id: number; account_id: number; mon: string; s: number }[]) {
		add(r.account_id, r.mon, -r.s);
		add(r.card_id, r.mon, -r.s);
	}
	for (const r of db
		.prepare(
			'SELECT from_id, to_id, substr(date, 1, 7) AS mon, SUM(amount) AS s FROM transfers GROUP BY from_id, to_id, substr(date, 1, 7)'
		)
		.all() as unknown as { from_id: number; to_id: number; mon: string; s: number }[]) {
		add(r.from_id, r.mon, -r.s);
		add(r.to_id, r.mon, r.s);
	}

	for (const r of db
		.prepare(
			'SELECT card_id, substr(date, 1, 7) AS mon, SUM(amount) AS s FROM card_adjustments GROUP BY card_id, substr(date, 1, 7)'
		)
		.all() as unknown as { card_id: number; mon: string; s: number }[]) {
		add(r.card_id, r.mon, r.s);
	}
	const anchors = new Map<number, [string, number][]>();
	let firstAnchor: string | null = null;
	for (const r of db
		.prepare('SELECT month, method_id, amount FROM account_balances ORDER BY month')
		.all() as unknown as { month: string; method_id: number; amount: number }[]) {
		const list = anchors.get(r.method_id) ?? [];
		list.push([r.month, r.amount]);
		anchors.set(r.method_id, list);
		if (firstAnchor === null || r.month < firstAnchor) firstAnchor = r.month;
	}
	return { deltas, anchors, unassigned, firstAnchor };
}

/**
 * 어떤 달이 시작될 때의 잔액 — 그 달 이전에 마지막으로 기록한 값에서 시작해 그 뒤 달들의 증감을 모두 더한다.
 * 기록한 적 없는 결제수단은 0원에서 시작해 처음 내역부터 모든 증감을 더한다(카드의 지난 사용분도 그대로 이어진다).
 * ignoreOwn 이면 그 달에 직접 적은 기록은 무시한다(이전 달에서 이어지는 값을 알고 싶을 때).
 */
function startOf(
	L: Ledger,
	id: number,
	month: string,
	ignoreOwn = false
): { start: number; anchorMonth: string | null } {
	const list = (L.anchors.get(id) ?? []).filter(([m]) => (ignoreOwn ? m < month : m <= month));
	const a = list[list.length - 1];
	const from = a ? a[0] : ''; // 기록한 적 없으면 처음 내역부터 모두 이어진다
	let sum = a ? a[1] : 0;
	for (const [mon, v] of L.deltas.get(id) ?? []) if (mon >= from && mon < month) sum += v;
	return { start: sum, anchorMonth: a ? a[0] : null };
}

/** 통장을 지정하지 않은 내역의 누적 — 기록을 시작한 달부터 month 직전까지 */
function unassignedBefore(L: Ledger, month: string): number {
	if (L.firstAnchor === null) return 0;
	let s = 0;
	for (const [mon, v] of L.unassigned) if (mon >= L.firstAnchor && mon < month) s += v;
	return s;
}

/** 그 달의 시작금액 = 통장 월초 잔액의 합 − 카드 월초 미결제 + 통장 미지정 내역의 이월 */
function monthStart(month: string): number | null {
	const L = loadLedger();
	const anyAnchor = [...L.anchors.values()].some((list) => list.some(([m]) => m <= month));
	if (!anyAnchor) {
		// 통장 잔액을 쓰기 전에 달마다 적어 둔 시작금액
		const legacy = getDb().prepare('SELECT amount FROM month_start WHERE month = ?').get(month) as
			| { amount: number }
			| undefined;
		return legacy?.amount ?? null;
	}
	let sum = unassignedBefore(L, month);
	for (const m of listPaymentMethods()) {
		const { start } = startOf(L, m.id, month);
		sum += m.kind === 'card' ? -start : start;
	}
	return sum;
}

/**
 * 월초 잔액 입력 저장. 이전 달에서 이어진 값과 같으면 기록을 두지 않는다
 * (그래야 앞 달 내역을 고쳤을 때 뒤 달 잔액도 같이 바뀐다).
 */
export function saveStartBalances(month: string, entries: [number, number | null][]): void {
	const L = loadLedger();
	for (const [id, amount] of entries) {
		if (amount === null) {
			setAccountBalance(month, id, null);
			continue;
		}
		const carried = startOf(L, id, month, true);
		if (carried.anchorMonth !== null && carried.start === amount) setAccountBalance(month, id, null);
		else setAccountBalance(month, id, amount);
	}
}

/** 이용기간(매달 S일 ~ 다음 달 S-1일)을 기준으로, 이 사용이 속한 이용기간의 시작 달 */
function cycleStartMonth(date: string, S: number): string {
	const mon = date.slice(0, 7);
	return Number(date.slice(8, 10)) >= S ? mon : addMonths(mon, -1);
}

/** 이용기간(시작 달 C)의 대금이 청구되는 달 — 이용기간이 끝난 뒤 처음 오는 결제일 */
function billMonthOf(C: string, S: number, payDay: number | null): string {
	const endMonth = S === 1 ? C : addMonths(C, 1);
	const endDay = S === 1 ? 31 : S - 1;
	return payDay !== null && payDay > endDay ? endMonth : addMonths(endMonth, 1);
}

/** 청구 달 B 에 청구되는 이용기간 */
function periodOf(B: string, S: number, payDay: number | null): { from: string; to: string } {
	for (let k = 0; k <= 3; k++) {
		const C = addMonths(B, -k);
		if (billMonthOf(C, S, payDay) === B) {
			return {
				from: `${C}-${pad2(S)}`,
				to: S === 1 ? `${C}-${pad2(daysInMonthOf(C))}` : `${addMonths(C, 1)}-${pad2(S - 1)}`
			};
		}
	}
	return { from: '', to: '' };
}

/**
 * 카드 청구 현황. 사용한 금액은 그 이용기간이 끝난 뒤 첫 결제일에 청구된다
 * (예: 이용기간 1일~말일, 결제일 15일 → 11월 사용분은 12월 15일 결제). 할부는 첫 청구부터 매달 나뉘어 청구된다.
 * asOf 시점에서 다음 결제일이 있는 달까지 청구된 금액 중 아직 결제하지 않은 것이 이번 결제 예정액이다.
 */
function cardBilling(L: Ledger, card: PaymentMethod, asOf: string): CardBill {
	const db = getDb();
	const S = card.cycleStart;
	const asOfMonth = asOf.slice(0, 7);
	const a = (L.anchors.get(card.id) ?? []).filter(([m]) => m <= asOfMonth).pop();
	// 기록한 적 없으면 처음 사용분부터 센다
	const floor = a ? `${a[0]}-01` : '0000-00-00';
	const carry = a ? a[1] : 0;
	const purchases = db
		.prepare(
			"SELECT date, amount, installments FROM entries WHERE kind = 'spend' AND method_id = ? AND date >= ? AND date <= ?"
		)
		.all(card.id, floor, asOf) as unknown as { date: string; amount: number; installments: number }[];
	const paid = (
		db
			.prepare(
				'SELECT COALESCE(SUM(amount), 0) AS s FROM card_payments WHERE card_id = ? AND date >= ? AND date <= ?'
			)
			.get(card.id, floor, asOf) as { s: number }
	).s;
	const adjust = (
		db
			.prepare(
				'SELECT COALESCE(SUM(amount), 0) AS s FROM card_adjustments WHERE card_id = ? AND date >= ? AND date <= ?'
			)
			.get(card.id, floor, asOf) as { s: number }
	).s;

	const day = Number(asOf.slice(8, 10));
	const dueMonth = card.payDay !== null && day > card.payDay ? addMonths(asOfMonth, 1) : asOfMonth;
	const nextMonth = addMonths(dueMonth, 1);
	let usage = 0;
	let installment = 0;
	let installLeft = 0;
	let bought = 0;
	
	for (const p of purchases) {
		const n = Math.max(1, p.installments);
		const base = Math.floor(p.amount / n);
		const firstBill = billMonthOf(cycleStartMonth(p.date, S), S, card.payDay);
		bought += p.amount;
		for (let i = 1; i <= n; i++) {
			const portion = i === n ? p.amount - base * (n - 1) : base;
			const billMonth = addMonths(firstBill, i - 1);
			
			if (billMonth <= dueMonth) {
				if (n > 1) installment += portion;
				else usage += portion;
			} else if (n > 1) installLeft += portion;
		}
	}
	const owed = carry + bought + adjust - paid;
	// 이미 결제한 금액과 할인 조정까지 반영한 금액은 일정 계산과 같은 규칙으로 구한다
	const sp = cardSchedule(L, card, asOf).plan;
	const sched = sp.schedule;
	const due = Math.max(0, sched.find((s) => s.month === dueMonth)?.amount ?? 0);
	const next = Math.max(0, sched.find((s) => s.month === nextMonth)?.amount ?? 0);
	const period = periodOf(dueMonth, S, card.payDay);
	const nextPeriod = periodOf(nextMonth, S, card.payDay);
	return {
		month: dueMonth,
		payDay: card.payDay,
		periodFrom: period.from,
		periodTo: period.to,
		nextMonth,
		next,
		nextFrom: nextPeriod.from,
		nextTo: nextPeriod.to,
		carry,
		adjust,
		usage,
		installment,
		paid,
		due,
		dueRaw: sp.dueRaw,
		later: Math.max(0, owed - due),
		installLeft
	};
}

export function addTransfer(date: string, fromId: number, toId: number, amount: number): number {
	const res = getDb()
		.prepare('INSERT INTO transfers (date, from_id, to_id, amount) VALUES (?, ?, ?, ?)')
		.run(date, fromId, toId, amount);
	return Number(res.lastInsertRowid);
}

export function deleteTransfer(id: number): void {
	getDb().prepare('DELETE FROM transfers WHERE id = ?').run(id);
}

export function addEntry(
	date: string,
	kind: Kind,
	amount: number,
	category: string,
	memo: string,
	methodId: number | null = null,
	goalId: number | null = null,
	installments = 1
): number {
	const res = getDb()
		.prepare(
			"INSERT INTO entries (date, kind, amount, category, memo, source, method_id, goal_id, installments) VALUES (?, ?, ?, ?, ?, 'manual', ?, ?, ?)"
		)
		.run(date, kind, amount, category, memo, methodId, goalId, installments);
	return Number(res.lastInsertRowid);
}

export function updateEntry(
	id: number,
	date: string,
	kind: Kind,
	amount: number,
	category: string,
	memo: string,
	methodId: number | null = null,
	goalId: number | null = null,
	installments = 1
): void {
	getDb()
		.prepare(
			'UPDATE entries SET date=?, kind=?, amount=?, category=?, memo=?, method_id=?, goal_id=?, installments=? WHERE id=?'
		)
		.run(date, kind, amount, category, memo, methodId, goalId, installments, id);
}

export function deleteEntry(id: number): void {
	getDb().prepare('DELETE FROM fixed_log WHERE entry_id = ?').run(id);
	getDb().prepare('DELETE FROM entries WHERE id = ?').run(id);
}

export function addFixed(
	name: string,
	day: number,
	amount: number,
	category: string,
	methodId: number | null = null
): number {
	const res = getDb()
		.prepare('INSERT INTO fixed_defs (name, day, amount, category, method_id) VALUES (?, ?, ?, ?, ?)')
		.run(name, day, amount, category, methodId);
	return Number(res.lastInsertRowid);
}

export function updateFixed(
	id: number,
	name: string,
	day: number,
	amount: number,
	category: string,
	methodId: number | null = null
): void {
	getDb()
		.prepare('UPDATE fixed_defs SET name=?, day=?, amount=?, category=?, method_id=? WHERE id=?')
		.run(name, day, amount, category, methodId, id);
}

export function deleteFixed(id: number): void {
	// 기록된 내역도 함께 지운다(정의 삭제 = 그 기록도 없었던 것)
	getDb()
		.prepare('DELETE FROM entries WHERE id IN (SELECT entry_id FROM fixed_log WHERE def_id = ?)')
		.run(id);
	getDb().prepare('DELETE FROM fixed_log WHERE def_id = ?').run(id);
	getDb().prepare('DELETE FROM fixed_defs WHERE id = ?').run(id);
}

/** 그 달에 아직 기록되지 않은 고정지출을 사용내역에 반영 */
export function recordFixed(defId: number, month: string): boolean {
	const db = getDb();
	const def = db.prepare('SELECT * FROM fixed_defs WHERE id = ?').get(defId) as
		{ id: number; name: string; day: number; amount: number; category: string; method_id: number | null } | undefined;
	if (!def) return false;
	const done = db
		.prepare('SELECT 1 FROM fixed_log WHERE def_id = ? AND month = ?')
		.get(defId, month);
	if (done) return false;
	const day = Math.min(def.day, daysInMonthOf(month));
	// 아직 오지 않은 날짜로는 기록하지 않는다
	if (`${month}-${pad2(day)}` > dateKey(new Date())) return false;
	const res = db
		.prepare(
			'INSERT INTO entries (date, kind, amount, category, memo, source, method_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
		)
		.run(
			`${month}-${pad2(day)}`,
			'spend',
			def.amount,
			def.category,
			def.name,
			`fixed:${def.id}`,
			def.method_id
		);
	db.prepare('INSERT INTO fixed_log (def_id, month, entry_id) VALUES (?, ?, ?)').run(
		defId,
		month,
		Number(res.lastInsertRowid)
	);
	return true;
}

/** 지정일이 maxDay 이하인 고정지출 중 아직 기록되지 않은 것을 모두 기록한다 */
export function recordAllFixed(month: string, maxDay = 31): number {
	const db = getDb();
	const defs = db
		.prepare('SELECT id FROM fixed_defs WHERE day <= ? ORDER BY day')
		.all(maxDay) as unknown as { id: number }[];
	let n = 0;
	for (const d of defs) if (recordFixed(d.id, month)) n++;
	return n;
}

/* ------------------------------------------------------------------ */
/* 분류 · 결제수단 · 저축목표 관리                                       */
/* ------------------------------------------------------------------ */

export function listCategories(): Category[] {
	return (
		getDb()
			.prepare(
				'SELECT id, kind, name, color, builtin, nature, position FROM categories ORDER BY kind, position, id'
			)
			.all() as unknown as {
			id: number;
			kind: 'spend' | 'income';
			name: string;
			color: string;
			builtin: number;
			nature: Nature;
			position: number;
		}[]
	).map((r) => ({
		id: r.id,
		kind: r.kind,
		name: r.name,
		color: r.color,
		builtin: r.builtin === 1,
		nature: r.nature,
		position: r.position
	}));
}

export function addCategory(
	kind: 'spend' | 'income',
	name: string,
	color: string,
	nature: Nature = 'consume'
): number {
	const db = getDb();
	const r = db
		.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM categories WHERE kind = ?')
		.get(kind) as { p: number };
	const res = db
		.prepare(
			'INSERT INTO categories (kind, name, color, builtin, position, nature) VALUES (?, ?, ?, 0, ?, ?)'
		)
		.run(kind, name, color, r.p, nature);
	return Number(res.lastInsertRowid);
}

export function updateCategory(id: number, name: string, color: string, nature?: Nature): void {
	const db = getDb();
	const cat = db.prepare('SELECT name, kind FROM categories WHERE id = ?').get(id) as
		{ name: string; kind: 'spend' | 'income' } | undefined;
	if (!cat) return;
	db.prepare('UPDATE categories SET name = ?, color = ? WHERE id = ?').run(name, color, id);
	if (nature) db.prepare('UPDATE categories SET nature = ? WHERE id = ?').run(nature, id);
	// 내역은 이름으로 참조되므로, 이름이 바뀌면 같은 종류의 내역도 함께 갱신한다
	if (cat.name !== name) {
		db.prepare('UPDATE entries SET category = ? WHERE category = ? AND kind = ?').run(
			name,
			cat.name,
			cat.kind
		);
		if (cat.kind === 'spend') {
			db.prepare('UPDATE category_budgets SET category = ? WHERE category = ?').run(name, cat.name);
		}
	}
}

/** 기본 분류이거나 사용 내역이 있으면 지울 수 없다 */
export function deleteCategory(id: number): boolean {
	const db = getDb();
	const cat = db.prepare('SELECT builtin FROM categories WHERE id = ?').get(id) as
		{ builtin: number } | undefined;
	if (!cat || cat.builtin === 1) return false;
	const used = db
		.prepare(
			'SELECT 1 FROM entries WHERE category = (SELECT name FROM categories WHERE id = ?) LIMIT 1'
		)
		.get(id);
	if (used) return false;
	db.prepare(
		'DELETE FROM category_budgets WHERE category = (SELECT name FROM categories WHERE id = ?)'
	).run(id);
	db.prepare('DELETE FROM categories WHERE id = ?').run(id);
	return true;
}

/* ------------------------------------------------------------------ */
/* 분류별 월 예산 — 매달 같은 금액이 적용된다                            */
/* ------------------------------------------------------------------ */

export function listBudgets(): Record<string, number> {
	const rows = getDb()
		.prepare('SELECT category, amount FROM category_budgets')
		.all() as unknown as {
		category: string;
		amount: number;
	}[];
	return Object.fromEntries(rows.map((r) => [r.category, r.amount]));
}

/** amount 가 null 이면 예산을 없앤다 */
export function setBudget(category: string, amount: number | null): void {
	const db = getDb();
	if (amount === null || amount <= 0) {
		db.prepare('DELETE FROM category_budgets WHERE category = ?').run(category);
	} else {
		db.prepare(
			'INSERT INTO category_budgets (category, amount) VALUES (?, ?) ON CONFLICT(category) DO UPDATE SET amount = excluded.amount'
		).run(category, amount);
	}
}

/** 그 달의 마감 잔액 — 시작금액이 없으면 null */
export function monthBalance(month: string): number | null {
	const db = getDb();
	const start = monthStart(month);
	if (start === null) return null;
	const [from, to] = monthBounds(month);
	const rows = db
		.prepare('SELECT kind, SUM(amount) AS s FROM entries WHERE date BETWEEN ? AND ? GROUP BY kind')
		.all(from, to) as unknown as { kind: Kind; s: number }[];
	let balance = start;
	for (const r of rows) balance += r.kind === 'income' ? r.s : -r.s;
	// 카드 금액 조정(늘림 +)은 갚을 돈이 늘어난 것이라 남은 돈에서 뺀다
	const adj = db
		.prepare('SELECT COALESCE(SUM(amount), 0) AS s FROM card_adjustments WHERE date BETWEEN ? AND ?')
		.get(from, to) as { s: number };
	return balance - adj.s;
}

export function listPaymentMethods(): PaymentMethod[] {
	return getDb()
		.prepare(
			"SELECT id, kind, name, position, pay_day, cycle_start FROM payment_methods ORDER BY CASE kind WHEN 'card' THEN 0 ELSE 1 END, position, id"
		)
		.all()
		.map((r) => {
			const m = r as unknown as PaymentMethod & { pay_day: number | null; cycle_start: number | null };
			return { id: m.id, kind: m.kind, name: m.name, position: m.position, payDay: m.pay_day, cycleStart: m.cycle_start ?? 1 };
		});
}

export function addPaymentMethod(
	kind: 'card' | 'account',
	name: string,
	payDay: number | null = null,
	cycleStart = 1
): number {
	const db = getDb();
	const r = db
		.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM payment_methods WHERE kind = ?')
		.get(kind) as { p: number };
	const res = db
		.prepare(
			'INSERT INTO payment_methods (kind, name, position, pay_day, cycle_start) VALUES (?, ?, ?, ?, ?)'
		)
		.run(kind, name, r.p, kind === 'card' ? payDay : null, kind === 'card' ? cycleStart : 1);
	return Number(res.lastInsertRowid);
}

export function updatePaymentMethod(
	id: number,
	name: string,
	payDay: number | null = null,
	cycleStart = 1
): void {
	getDb()
		.prepare(
			"UPDATE payment_methods SET name = ?, pay_day = CASE kind WHEN 'card' THEN ? END, cycle_start = CASE kind WHEN 'card' THEN ? ELSE 1 END WHERE id = ?"
		)
		.run(name, payDay, cycleStart, id);
}

/** 사용 내역이 있으면 지울 수 없다 */
export function deletePaymentMethod(id: number): boolean {
	const db = getDb();
	const used = db.prepare('SELECT 1 FROM entries WHERE method_id = ? LIMIT 1').get(id);
	const paid = db
		.prepare('SELECT 1 FROM card_payments WHERE card_id = ? OR account_id = ? LIMIT 1')
		.get(id, id);
	const moved = db
		.prepare('SELECT 1 FROM transfers WHERE from_id = ? OR to_id = ? LIMIT 1')
		.get(id, id);
	const adjusted = db.prepare('SELECT 1 FROM card_adjustments WHERE card_id = ? LIMIT 1').get(id);
	const fixedUse = db.prepare('SELECT 1 FROM fixed_defs WHERE method_id = ? LIMIT 1').get(id);
	if (used || paid || moved || adjusted || fixedUse) return false;
	db.prepare('DELETE FROM account_balances WHERE method_id = ?').run(id);
	db.prepare('DELETE FROM payment_methods WHERE id = ?').run(id);
	return true;
}

export function listSavingsGoals(): SavingsGoal[] {
	return (
		getDb()
			.prepare(
				'SELECT id, name, target_amount, end_month, position, initial_amount FROM savings_goals ORDER BY position, id'
			)
			.all() as unknown as {
			id: number;
			name: string;
			target_amount: number;
			end_month: string;
			position: number;
			initial_amount: number | null;
		}[]
	).map((r) => ({
		id: r.id,
		name: r.name,
		targetAmount: r.target_amount,
		endMonth: r.end_month,
			initialAmount: r.initial_amount ?? 0,
		position: r.position
	}));
}

export function addSavingsGoal(
	name: string,
	targetAmount: number,
	endMonth: string,
	initialAmount = 0
): number {
	const db = getDb();
	const r = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM savings_goals').get() as {
		p: number;
	};
	const res = db
		.prepare(
			'INSERT INTO savings_goals (name, target_amount, end_month, position, initial_amount) VALUES (?, ?, ?, ?, ?)'
		)
		.run(name, targetAmount, endMonth, r.p, initialAmount);
	return Number(res.lastInsertRowid);
}

export function updateSavingsGoal(
	id: number,
	name: string,
	targetAmount: number,
	endMonth: string,
	initialAmount = 0
): void {
	getDb()
		.prepare(
			'UPDATE savings_goals SET name = ?, target_amount = ?, end_month = ?, initial_amount = ? WHERE id = ?'
		)
		.run(name, targetAmount, endMonth, initialAmount, id);
}

/** 저축 내역의 목표 참조를 없앤 뒤 삭제한다 */
export function deleteSavingsGoal(id: number): void {
	const db = getDb();
	db.prepare('UPDATE entries SET goal_id = NULL WHERE goal_id = ?').run(id);
	db.prepare('DELETE FROM savings_goals WHERE id = ?').run(id);
}

/* ------------------------------------------------------------------ */
/* 월 데이터 집계                                                        */
/* ------------------------------------------------------------------ */

export function getMonthData(month: string, selectedDay: number): MonthData {
	const db = getDb();
	const [from, to] = monthBounds(month);
	const raw = db
		.prepare(
			`SELECT e.*, m.name AS method_name, m.kind AS method_kind, g.name AS goal_name
			   FROM entries e
			   LEFT JOIN payment_methods m ON m.id = e.method_id
			   LEFT JOIN savings_goals g ON g.id = e.goal_id
			   WHERE e.date BETWEEN ? AND ?
			   ORDER BY e.date, e.id`
		)
		.all(from, to) as unknown as {
		id: number;
		date: string;
		kind: Kind;
		amount: number;
		category: string;
		memo: string;
		source: string;
		method_id: number | null;
		goal_id: number | null;
		method_name: string | null;
		method_kind: 'card' | 'account' | null;
		goal_name: string | null;
		installments: number;
	}[];
	const rows: Entry[] = raw.map((r) => ({
		id: r.id,
		date: r.date,
		kind: r.kind,
		amount: r.amount,
		category: r.category,
		memo: r.memo,
		source: r.source,
		methodId: r.method_id,
		methodName: r.method_name,
		goalId: r.goal_id,
		goalName: r.goal_name,
		installments: r.installments ?? 1
	}));

	const fixedDefs: FixedDef[] = (
		db
			.prepare(
				`SELECT d.id, d.name, d.day, d.amount, d.category, d.method_id, m.name AS method_name
				   FROM fixed_defs d LEFT JOIN payment_methods m ON m.id = d.method_id
				   ORDER BY d.day, d.id`
			)
			.all() as unknown as {
			id: number;
			name: string;
			day: number;
			amount: number;
			category: string;
			method_id: number | null;
			method_name: string | null;
		}[]
	).map((d) => ({
		id: d.id,
		name: d.name,
		day: d.day,
		amount: d.amount,
		category: d.category,
		methodId: d.method_id,
		methodName: d.method_name
	}));
	const recordedRows = db
		.prepare('SELECT def_id FROM fixed_log WHERE month = ?')
		.all(month) as unknown as { def_id: number }[];
	const recordedFixedIds = recordedRows.map((r) => r.def_id);

	const today = new Date();
	const todayStr = dateKey(today);
	const todayInMonth = monthKey(today) === month;

	const startAmount = monthStart(month);
	const L = loadLedger();
	const [monthFrom, monthTo] = monthBounds(month);
	const payments: CardPayment[] = (
		db
			.prepare(
				`SELECT p.id, p.date, p.card_id, p.account_id, p.amount, c.name AS card_name, a.name AS account_name
				   FROM card_payments p
				   LEFT JOIN payment_methods c ON c.id = p.card_id
				   LEFT JOIN payment_methods a ON a.id = p.account_id
				   WHERE p.date BETWEEN ? AND ? ORDER BY p.date, p.id`
			)
			.all(monthFrom, monthTo) as unknown as {
			id: number;
			date: string;
			card_id: number;
			account_id: number;
			amount: number;
			card_name: string | null;
			account_name: string | null;
		}[]
	).map((r) => ({
		id: r.id,
		date: r.date,
		cardId: r.card_id,
		cardName: r.card_name ?? '삭제된 카드',
		accountId: r.account_id,
		accountName: r.account_name ?? '삭제된 통장',
		amount: r.amount
	}));
	const transfers: Transfer[] = (
		db
			.prepare(
				`SELECT t.id, t.date, t.from_id, t.to_id, t.amount, f.name AS from_name, o.name AS to_name
				   FROM transfers t
				   LEFT JOIN payment_methods f ON f.id = t.from_id
				   LEFT JOIN payment_methods o ON o.id = t.to_id
				   WHERE t.date BETWEEN ? AND ? ORDER BY t.date, t.id`
			)
			.all(monthFrom, monthTo) as unknown as {
			id: number;
			date: string;
			from_id: number;
			to_id: number;
			amount: number;
			from_name: string | null;
			to_name: string | null;
		}[]
	).map((r) => ({
		id: r.id,
		date: r.date,
		fromId: r.from_id,
		fromName: r.from_name ?? '삭제된 통장',
		toId: r.to_id,
		toName: r.to_name ?? '삭제된 통장',
		amount: r.amount
	}));
	const cardAdjustments: CardAdjustment[] = (
		db
			.prepare(
				`SELECT j.id, j.date, j.card_id, j.amount, j.memo, c.name AS card_name
				   FROM card_adjustments j
				   LEFT JOIN payment_methods c ON c.id = j.card_id
				   WHERE j.date BETWEEN ? AND ? ORDER BY j.date, j.id`
			)
			.all(monthFrom, monthTo) as unknown as {
			id: number;
			date: string;
			card_id: number;
			amount: number;
			memo: string;
			card_name: string | null;
		}[]
	).map((r) => ({
		id: r.id,
		date: r.date,
		cardId: r.card_id,
		cardName: r.card_name ?? '삭제된 카드',
		amount: r.amount,
		memo: r.memo
	}));
	const adjBy = new Map<number, number>();
	for (const j of cardAdjustments) adjBy.set(j.cardId, (adjBy.get(j.cardId) ?? 0) + j.amount);
	const spentBy = new Map<number, number>();
	for (const e of rows)
		if (e.kind === 'spend' && e.methodId !== null)
			spentBy.set(e.methodId, (spentBy.get(e.methodId) ?? 0) + e.amount);
	const paidTo = new Map<number, number>(); // 카드 → 이번 달 결제한 돈
	for (const p of payments) paidTo.set(p.cardId, (paidTo.get(p.cardId) ?? 0) + p.amount);

	const methods = listPaymentMethods();
	// 통장 현재 잔액 = 월초(이전 달에서 이어진 값) + 이번 달 입금 − 지출 − 카드대금 ± 송금
	const accountBalances = methods
		.filter((m) => m.kind === 'account')
		.map((m) => {
			const { start, anchorMonth } = startOf(L, m.id, month);
			return {
				id: m.id,
				name: m.name,
				amount: start,
				current: start + (L.deltas.get(m.id)?.get(month) ?? 0),
				recorded: anchorMonth !== null
			};
		});
	// 카드 미결제 = 월초(이전 달에서 이어진 값) + 이번 달 사용(할부는 전체) − 이번 달 결제
	const billAsOf = todayStr < monthTo ? todayStr : monthTo;
	const cardDebts: CardDebt[] = methods
		.filter((m) => m.kind === 'card')
		.map((m) => {
			const { start } = startOf(L, m.id, month);
			const spent = spentBy.get(m.id) ?? 0;
			const paid = paidTo.get(m.id) ?? 0;
			const adjusted = adjBy.get(m.id) ?? 0;
			return {
				id: m.id,
				name: m.name,
				payDay: m.payDay,
				cycleStart: m.cycleStart,
				start,
				spent,
				paid,
				adjusted,
				owed: start + spent + adjusted - paid,
				bill: cardBilling(L, m, billAsOf)
			};
		});
	const unassignedNet = unassignedBefore(L, addMonths(month, 1));

	// 일자별 집계
	const daysInMonth = daysInMonthOf(month);
	const byDay: DayCell[] = [];
	for (let d = 1; d <= daysInMonth; d++) {
		byDay.push({
			date: `${month}-${pad2(d)}`,
			day: d,
			entries: [],
			spend: 0,
			income: 0,
			save: 0,
			fixed: 0,
			alerts: []
		});
	}
	let spendTotal = 0;
	let incomeTotal = 0;
	let saveTotal = 0;
	let fixedTotal = 0;
	const catMap = new Map<string, { amount: number; fixed: number }>();
	const methodMap = new Map<number, { name: string; kind: 'card' | 'account'; amount: number }>();

	for (const e of rows) {
		const d = Number(e.date.slice(8, 10));
		const cell = byDay[d - 1];
		cell.entries.push(e);
		if (e.kind === 'income') {
			cell.income += e.amount;
			incomeTotal += e.amount;
		} else if (e.kind === 'save') {
			cell.save += e.amount;
			saveTotal += e.amount;
		} else {
			cell.spend += e.amount;
			spendTotal += e.amount;
			const isFixed = e.source.startsWith('fixed:');
			if (isFixed) {
				cell.fixed += e.amount;
				fixedTotal += e.amount;
			}
			if (e.methodId !== null && e.methodName) {
				const kind = raw.find((x) => x.id === e.id)?.method_kind ?? 'card';
				const m = methodMap.get(e.methodId) ?? { name: e.methodName, kind, amount: 0 };
				m.amount += e.amount;
				methodMap.set(e.methodId, m);
			}
			const cat = catMap.get(e.category) ?? { amount: 0, fixed: 0 };
			cat.amount += e.amount;
			if (isFixed) cat.fixed += e.amount;
			catMap.set(e.category, cat);
		}
	}

	// 저축은 통장에서 이체된 것으로 보아 남은 돈에서 차감한다
	const adjTotal = cardAdjustments.reduce((s, j) => s + j.amount, 0);
	const adjByDate = new Map<string, number>();
	for (const j of cardAdjustments) adjByDate.set(j.date, (adjByDate.get(j.date) ?? 0) + j.amount);
	const balance =
		startAmount === null ? null : startAmount + incomeTotal - spendTotal - saveTotal - adjTotal;

	// 잔액 곡선 — 지나간 날만 실제 값, 미래는 오늘 값 유지
	const route: RoutePoint[] = [];
	const start0 = startAmount ?? 0;
	let running = start0;
	const fixedDays = new Set(byDay.filter((c) => c.fixed > 0).map((c) => c.day));
	for (const cell of byDay) {
		if (cell.date <= todayStr) {
			running =
				start0 +
				byDay
					.slice(0, cell.day)
					.reduce((s, c) => s + c.income - c.spend - c.save - (adjByDate.get(c.date) ?? 0), 0);
		}
		route.push({
			day: cell.day,
			date: cell.date,
			balance:
				cell.date <= todayStr ? running : start0 + incomeTotal - spendTotal - saveTotal - adjTotal,
			hasFixed: fixedDays.has(cell.day)
		});
	}

	const natureOf = new Map(
		listCategories()
			.filter((c) => c.kind === 'spend')
			.map((c) => [c.name, c.nature])
	);
	const byNature = { consume: 0, bill: 0 };
	for (const [name, v] of catMap) byNature[natureOf.get(name) === 'bill' ? 'bill' : 'consume'] += v.amount;

	const colors = new Map(listCategories().map((c) => [c.name, c.color]));
	const byCategory: CategorySlice[] = [...catMap.entries()]
		.map(([name, v]) => ({
			name,
			amount: v.amount,
			fixedAmount: v.fixed,
			color: colors.get(name) ?? '#56617A'
		}))
		.sort((a, b) => b.amount - a.amount);

	const methodOrder = new Map(listPaymentMethods().map((m) => [m.id, m.position]));
	const byMethod: MethodSlice[] = [...methodMap.entries()]
		.map(([id, v]) => ({ id, name: v.name, kind: v.kind, amount: v.amount }))
		.sort(
			(a, b) => (methodOrder.get(a.id) ?? 0) - (methodOrder.get(b.id) ?? 0) || b.amount - a.amount
		);

	// 저축 목표 — 누적 저축 대비 달성률, 이 달에 모아야 할 금액
	const goalSums = db
		.prepare(
			"SELECT goal_id, SUM(amount) AS s FROM entries WHERE kind = 'save' AND goal_id IS NOT NULL GROUP BY goal_id"
		)
		.all() as unknown as { goal_id: number; s: number }[];
	const goalSumMap = new Map(goalSums.map((r) => [r.goal_id, r.s]));
	// 이 달이 시작되기 전까지 쌓인 금액 — 이 달 필요액은 그 시점의 남은 금액으로 계산한다
	const beforeSums = db
		.prepare(
			"SELECT goal_id, SUM(amount) AS s FROM entries WHERE kind = 'save' AND goal_id IS NOT NULL AND date < ? GROUP BY goal_id"
		)
		.all(from) as unknown as { goal_id: number; s: number }[];
	const beforeMap = new Map(beforeSums.map((r) => [r.goal_id, r.s]));
	const savingsGoals: SavingsGoalInfo[] = listSavingsGoals().map((g) => {
		const saved = (goalSumMap.get(g.id) ?? 0) + g.initialAmount;
		const monthsLeft = monthsBetween(month, g.endMonth) + 1; // 이 달 포함
		const left = Math.max(0, g.targetAmount - ((beforeMap.get(g.id) ?? 0) + g.initialAmount));
		return {
			...g,
			saved,
			progress: g.targetAmount > 0 ? Math.min(100, Math.round((saved / g.targetAmount) * 100)) : 0,
			monthlyNeeded: monthsLeft >= 1 ? Math.ceil(left / monthsLeft) : 0
		};
	});
	const monthSavePlan = savingsGoals.reduce((sum, g) => sum + g.monthlyNeeded, 0);

	// 분류별 예산 — 사용률과 경고 단계(80% 이상 주의, 100% 초과 초과)
	const budgetMap = listBudgets();
	const budgets: BudgetInfo[] = Object.entries(budgetMap)
		.filter(([name]) => colors.has(name))
		.map(([name, budget]) => {
			const spent = catMap.get(name)?.amount ?? 0;
			const pct = Math.round((spent / budget) * 100);
			return {
				name,
				color: colors.get(name) ?? '#6B7280',
				budget,
				spent,
				pct,
				level: spent > budget ? 'over' : pct >= 80 ? 'warn' : 'ok'
			} satisfies BudgetInfo;
		})
		.sort((a, b) => b.pct - a.pct);

	// 날짜별 경고 — 누적 지출이 80%·100%를 처음 넘은 날에 표시한다
	const budgetRunning: Record<string, number> = {};
	for (const cell of byDay) {
		for (const e of cell.entries) {
			if (e.kind !== 'spend' || budgetMap[e.category] === undefined) continue;
			const before = budgetRunning[e.category] ?? 0;
			const after = before + e.amount;
			budgetRunning[e.category] = after;
			const limit = budgetMap[e.category];
			const level =
				before <= limit && after > limit
					? 'over'
					: before < limit * 0.8 && after >= limit * 0.8
						? 'warn'
						: null;
			if (level) {
				const same = cell.alerts.find((a) => a.category === e.category);
				if (same) same.level = level === 'over' ? 'over' : same.level;
				else cell.alerts.push({ category: e.category, level });
			}
		}
	}

	// 지난달 대비 — 이번 달은 지난달의 같은 기간(1일~오늘)과 비교한다
	const prevMonth = addMonths(month, -1);
	const compareDays = todayInMonth ? today.getDate() : month < monthKey(today) ? daysInMonth : 0;
	const prevLast = Math.min(compareDays, daysInMonthOf(prevMonth));
	const prevRows =
		prevLast > 0
			? (db
					.prepare(
						"SELECT category, SUM(amount) AS s FROM entries WHERE kind = 'spend' AND date BETWEEN ? AND ? GROUP BY category"
					)
					.all(`${prevMonth}-01`, `${prevMonth}-${pad2(prevLast)}`) as unknown as {
					category: string;
					s: number;
				}[])
			: [];
	const compare: MonthCompare = {
		prevMonth,
		days: prevLast,
		prevSpendTotal: prevRows.reduce((s, r) => s + r.s, 0),
		byCategory: prevRows.map((r) => ({ name: r.category, amount: r.s }))
	};

	const safeDay = Math.min(Math.max(selectedDay, 1), daysInMonth);
	const selectedDate = `${month}-${pad2(safeDay)}`;

	return {
		month,
		monthLabel: monthLabel(month),
		today: todayStr,
		todayInMonth,
		daysInMonth,
		startAmount,
		accountBalances,
		unassignedNet,
		transfers,
		byNature,
		cardDebts,
		cardPayments: payments,
		cardAdjustments,
		entries: rows,
		fixedDefs,
		recordedFixedIds,
		spendTotal,
		incomeTotal,
		saveTotal,
		fixedTotal,
		balance,
		byDay,
		route,
		byCategory,
		byMethod,
		categories: listCategories(),
		paymentMethods: listPaymentMethods(),
		savingsGoals,
		monthSavePlan,
		budgets,
		compare,
		prevBalance: monthBalance(prevMonth),
		selectedDay: safeDay,
		selectedDate,
		selectedEntries: byDay[safeDay - 1].entries
	};
}

/* ------------------------------------------------------------------ */
/* 내역 검색                                                            */
/* ------------------------------------------------------------------ */
/* 자산 · 결제 일정 · 월별 추이 · 내보내기 (모두 읽기 전용)                */
/* ------------------------------------------------------------------ */

/** 카드 한 장의 앞으로의 청구 일정과 진행 중인 할부 */
function cardSchedule(
	L: Ledger,
	card: PaymentMethod,
	asOf: string
): { plan: CardPlan; installs: InstallmentInfo[] } {
	const db = getDb();
	const S = card.cycleStart;
	const asOfMonth = asOf.slice(0, 7);
	const a = (L.anchors.get(card.id) ?? []).filter(([m]) => m <= asOfMonth).pop();
	const floor = a ? `${a[0]}-01` : '0000-00-00';
	const carry = a ? a[1] : 0;
	const sumOf = (table: 'card_payments' | 'card_adjustments') =>
		(
			db
				.prepare(
					`SELECT COALESCE(SUM(amount), 0) AS s FROM ${table} WHERE card_id = ? AND date >= ? AND date <= ?`
				)
				.get(card.id, floor, asOf) as { s: number }
		).s;
	const paid = sumOf('card_payments');
	const adjust = sumOf('card_adjustments');
	const purchases = db
		.prepare(
			"SELECT id, date, amount, installments, memo, category FROM entries WHERE kind = 'spend' AND method_id = ? AND date >= ? AND date <= ? ORDER BY date, id"
		)
		.all(card.id, floor, asOf) as unknown as {
		id: number;
		date: string;
		amount: number;
		installments: number;
		memo: string;
		category: string;
	}[];

	const day = Number(asOf.slice(8, 10));
	const dueMonth = card.payDay !== null && day > card.payDay ? addMonths(asOfMonth, 1) : asOfMonth;
	const buckets = new Map<string, number>();
	// 이미 지난 청구 달에 남은 금액은 이번 결제에 합쳐 낸다
	const put = (m: string, v: number) => {
		const key = m < dueMonth ? dueMonth : m;
		buckets.set(key, (buckets.get(key) ?? 0) + v);
	};
	put(dueMonth, carry + adjust);

	const installs: InstallmentInfo[] = [];
	let bought = 0;
	for (const p of purchases) {
		const n = Math.max(1, p.installments);
		const base = Math.floor(p.amount / n);
		const firstBill = billMonthOf(cycleStartMonth(p.date, S), S, card.payDay);
		bought += p.amount;
		let billed = 0;
		let left = 0;
		for (let i = 1; i <= n; i++) {
			const portion = i === n ? p.amount - base * (n - 1) : base;
			const bm = addMonths(firstBill, i - 1);
			put(bm, portion);
			if (bm <= dueMonth) billed++;
			else left += portion;
		}
		const lastMonth = addMonths(firstBill, n - 1);
		if (n > 1 && lastMonth >= dueMonth) {
			installs.push({
				id: p.id,
				date: p.date,
				memo: p.memo,
				category: p.category,
				cardId: card.id,
				cardName: card.name,
				total: p.amount,
				months: n,
				billedCount: billed,
				monthly: base,
				remainingAmount: left,
				lastMonth
			});
		}
	}

	// 이미 결제한 금액은 가장 먼저 청구된 것부터 채운다
	let rest = paid;
	let credit = 0;
	const schedule: CardScheduleItem[] = [];
	for (const [month, value] of [...buckets.entries()].sort((x, y) => x[0].localeCompare(y[0]))) {
		let amount = value;
		if (rest > 0 && amount > 0) {
			const cut = Math.min(rest, amount);
			amount -= cut;
			rest -= cut;
		}
		// 할인처럼 청구액보다 큰 마이너스 조정은 다음 청구에서 마저 깎는다
		if (amount < 0) {
			credit -= amount;
			amount = 0;
		} else if (credit > 0 && amount > 0) {
			const use = Math.min(credit, amount);
			amount -= use;
			credit -= use;
		}
		if (amount !== 0) {
			const { from, to } = periodOf(month, S, card.payDay);
			schedule.push({ month, amount, from, to });
		}
	}
	const owed = carry + bought + adjust - paid;
	return {
		plan: {
			id: card.id,
			name: card.name,
			payDay: card.payDay,
			cycleStart: S,
			owed,
			due: schedule.find((s) => s.month === dueMonth)?.amount ?? 0,
			dueRaw: (buckets.get(dueMonth) ?? 0) - paid,
			dueMonth,
			schedule: schedule.slice(0, 12)
		},
		installs
	};
}

/** 통장·카드 현황, 앞으로의 카드대금 결제 일정, 진행 중인 할부 */
export function getAssets(): AssetsData {
	const L = loadLedger();
	const now = new Date();
	const todayStr = dateKey(now);
	const month = monthKey(now);
	const methods = listPaymentMethods();

	const accounts = methods
		.filter((m) => m.kind === 'account')
		.map((m) => ({
			id: m.id,
			name: m.name,
			current: startOf(L, m.id, month).start + (L.deltas.get(m.id)?.get(month) ?? 0)
		}));
	const accountTotal = accounts.reduce((s, a) => s + a.current, 0);

	const cards: CardPlan[] = [];
	const installments: InstallmentInfo[] = [];
	for (const m of methods.filter((x) => x.kind === 'card')) {
		const r = cardSchedule(L, m, todayStr);
		cards.push(r.plan);
		installments.push(...r.installs);
	}
	installments.sort((x, y) => x.lastMonth.localeCompare(y.lastMonth) || x.date.localeCompare(y.date));
	const cardOwedTotal = cards.reduce((s, c) => s + c.owed, 0);

	// 결제 일정: 달마다 카드별 금액과, 그것을 다 낸 뒤 남는 통장 합계(입금은 계산에 넣지 않는다)
	const byMonth = new Map<string, { cardId: number; name: string; amount: number; payDay: number | null }[]>();
	for (const c of cards)
		for (const s of c.schedule) {
			const list = byMonth.get(s.month) ?? [];
			list.push({ cardId: c.id, name: c.name, amount: s.amount, payDay: c.payDay });
			byMonth.set(s.month, list);
		}
	let running = accountTotal;
	const timeline = [...byMonth.entries()]
		.sort((x, y) => x[0].localeCompare(y[0]))
		.slice(0, 12)
		.map(([m, items]) => {
			items.sort((x, y) => (x.payDay ?? 99) - (y.payDay ?? 99));
			const total = items.reduce((s, i) => s + i.amount, 0);
			running -= total;
			return { month: m, total, items, after: running };
		});

	return {
		today: todayStr,
		accounts,
		accountTotal,
		cardOwedTotal,
		net: accountTotal - cardOwedTotal,
		cards,
		installments,
		timeline
	};
}

/** 최근 count 달의 월별 입금·지출·저축·고정지출·카드대금 결제 */
export function getTrend(endMonth: string, count = 12): TrendRow[] {
	const db = getDb();
	const months = Array.from({ length: count }, (_, i) => addMonths(endMonth, i - (count - 1)));
	const from = `${months[0]}-01`;
	const to = `${endMonth}-31`;
	const rows = db
		.prepare(
			"SELECT substr(date, 1, 7) AS mon, kind, (source LIKE 'fixed:%') AS fx, SUM(amount) AS s FROM entries WHERE date BETWEEN ? AND ? GROUP BY mon, kind, fx"
		)
		.all(from, to) as unknown as { mon: string; kind: Kind; fx: number; s: number }[];
	const paid = db
		.prepare(
			'SELECT substr(date, 1, 7) AS mon, SUM(amount) AS s FROM card_payments WHERE date BETWEEN ? AND ? GROUP BY mon'
		)
		.all(from, to) as unknown as { mon: string; s: number }[];
	const out = new Map<string, TrendRow>(
		months.map((m) => [m, { month: m, income: 0, spend: 0, save: 0, fixed: 0, cardPaid: 0 }])
	);
	for (const r of rows) {
		const t = out.get(r.mon);
		if (!t) continue;
		if (r.kind === 'income') t.income += r.s;
		else if (r.kind === 'save') t.save += r.s;
		else {
			t.spend += r.s;
			if (r.fx) t.fixed += r.s;
		}
	}
	for (const r of paid) {
		const t = out.get(r.mon);
		if (t) t.cardPaid += r.s;
	}
	return months.map((m) => out.get(m)!);
}

/** 한 해의 분류별 월 지출 */
export function getCategoryYear(year: number): CategoryYear {
	const db = getDb();
	const rows = db
		.prepare(
			"SELECT category, CAST(substr(date, 6, 2) AS INTEGER) AS mon, SUM(amount) AS s FROM entries WHERE kind = 'spend' AND date BETWEEN ? AND ? GROUP BY category, mon"
		)
		.all(`${year}-01-01`, `${year}-12-31`) as unknown as { category: string; mon: number; s: number }[];
	const info = new Map(
		listCategories()
			.filter((c) => c.kind === 'spend')
			.map((c) => [c.name, c])
	);
	const byCat = new Map<string, number[]>();
	for (const r of rows) {
		const arr = byCat.get(r.category) ?? Array<number>(12).fill(0);
		arr[r.mon - 1] += r.s;
		byCat.set(r.category, arr);
	}
	const list = [...byCat.entries()]
		.map(([name, months]) => ({
			name,
			color: info.get(name)?.color ?? '#6B7280',
			nature: info.get(name)?.nature ?? ('consume' as Nature),
			months,
			total: months.reduce((s, v) => s + v, 0)
		}))
		.sort((x, y) => y.total - x.total);
	const monthTotals = Array.from({ length: 12 }, (_, i) => list.reduce((s, r) => s + r.months[i], 0));
	return { year, rows: list, monthTotals };
}

export type ExportKind = 'entries' | 'payments' | 'transfers' | 'adjustments' | 'balances';

/** 내보내기용 표 — 머리글 + 행. 읽기만 한다 */
export function exportTable(kind: ExportKind): string[][] {
	const db = getDb();
	const names = new Map(listPaymentMethods().map((m) => [m.id, m.name]));
	const nm = (id: number | null) => (id === null ? '' : (names.get(id) ?? '삭제됨'));
	if (kind === 'entries') {
		const rows = db
			.prepare(
				`SELECT e.date, e.kind, e.amount, e.category, e.memo, e.method_id, g.name AS goal, e.installments, e.source
				   FROM entries e LEFT JOIN savings_goals g ON g.id = e.goal_id ORDER BY e.date, e.id`
			)
			.all() as unknown as {
			date: string;
			kind: string;
			amount: number;
			category: string;
			memo: string;
			method_id: number | null;
			goal: string | null;
			installments: number;
			source: string;
		}[];
		const label: Record<string, string> = { spend: '지출', income: '입금', save: '저축' };
		return [
			['날짜', '종류', '금액', '분류', '메모', '결제수단·통장', '저축 목표', '할부(개월)', '구분'],
			...rows.map((r) => [
				r.date,
				label[r.kind] ?? r.kind,
				String(r.amount),
				r.category,
				r.memo,
				nm(r.method_id),
				r.goal ?? '',
				String(r.installments ?? 1),
				r.source.startsWith('fixed:') ? '고정지출' : '직접 기록'
			])
		];
	}
	if (kind === 'payments') {
		const rows = db
			.prepare('SELECT date, card_id, account_id, amount FROM card_payments ORDER BY date, id')
			.all() as unknown as { date: string; card_id: number; account_id: number; amount: number }[];
		return [
			['날짜', '카드', '결제한 통장', '금액'],
			...rows.map((r) => [r.date, nm(r.card_id), nm(r.account_id), String(r.amount)])
		];
	}
	if (kind === 'transfers') {
		const rows = db
			.prepare('SELECT date, from_id, to_id, amount FROM transfers ORDER BY date, id')
			.all() as unknown as { date: string; from_id: number; to_id: number; amount: number }[];
		return [
			['날짜', '보낸 통장', '받은 통장', '금액'],
			...rows.map((r) => [r.date, nm(r.from_id), nm(r.to_id), String(r.amount)])
		];
	}
	if (kind === 'adjustments') {
		const rows = db
			.prepare('SELECT date, card_id, amount, memo FROM card_adjustments ORDER BY date, id')
			.all() as unknown as { date: string; card_id: number; amount: number; memo: string }[];
		return [
			['날짜', '카드', '조정 금액(+늘림 −줄임)', '메모'],
			...rows.map((r) => [r.date, nm(r.card_id), String(r.amount), r.memo])
		];
	}
	const rows = db
		.prepare('SELECT month, method_id, amount FROM account_balances ORDER BY month, method_id')
		.all() as unknown as { month: string; method_id: number; amount: number }[];
	return [
		['월', '통장·카드', '월초 금액(카드는 미결제)'],
		...rows.map((r) => [r.month, nm(r.method_id), String(r.amount)])
	];
}

/* ------------------------------------------------------------------ */

export type EntrySort = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';

export interface EntryFilter {
	q?: string;
	kind?: Kind;
	categories?: string[]; // 여러 분류를 한꺼번에
	methodKind?: 'card' | 'account'; // 카드로 낸 것만 / 통장으로 낸 것만
	methodId?: number;
	from?: string;
	to?: string;
	min?: number;
	max?: number;
	source?: 'fixed' | 'manual' | 'installment';
	nature?: Nature; // 지출 분류의 성격(소비/공과금)
	sort: EntrySort;
}

export interface EntrySearchResult {
	rows: Entry[];
	count: number; // 조건에 맞는 전체 건수(rows 는 limit 까지만)
	spend: number;
	income: number;
	save: number;
	byCategory: { name: string; kind: Kind; count: number; sum: number }[]; // 조건에 맞는 내역의 분류별 합계
}

const SORT_SQL: Record<EntrySort, string> = {
	date_desc: 'e.date DESC, e.id DESC',
	date_asc: 'e.date ASC, e.id ASC',
	amount_desc: 'e.amount DESC, e.date DESC',
	amount_asc: 'e.amount ASC, e.date DESC'
};

/** 카드대금 결제 기록 검색 — 기간·결제수단(카드 또는 통장)·금액 범위·카드/통장 이름 */
export function searchCardPayments(f: {
	q?: string;
	methodId?: number;
	from?: string;
	to?: string;
	min?: number;
	max?: number;
	sort: EntrySort;
}): CardPayment[] {
	const where: string[] = [];
	const params: (string | number)[] = [];
	if (f.q) {
		const like = `%${f.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
		where.push("(c.name LIKE ? ESCAPE '\\' OR a.name LIKE ? ESCAPE '\\' OR '카드대금' LIKE ? ESCAPE '\\')");
		params.push(like, like, like);
	}
	if (f.methodId !== undefined) {
		where.push('(p.card_id = ? OR p.account_id = ?)');
		params.push(f.methodId, f.methodId);
	}
	if (f.from) {
		where.push('p.date >= ?');
		params.push(f.from);
	}
	if (f.to) {
		where.push('p.date <= ?');
		params.push(f.to);
	}
	if (f.min !== undefined) {
		where.push('p.amount >= ?');
		params.push(f.min);
	}
	if (f.max !== undefined) {
		where.push('p.amount <= ?');
		params.push(f.max);
	}
	const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
	const order = SORT_SQL[f.sort].replace(/e\./g, 'p.');
	return (
		getDb()
			.prepare(
				`SELECT p.id, p.date, p.card_id, p.account_id, p.amount, c.name AS card_name, a.name AS account_name
				   FROM card_payments p
				   LEFT JOIN payment_methods c ON c.id = p.card_id
				   LEFT JOIN payment_methods a ON a.id = p.account_id
				   ${clause} ORDER BY ${order} LIMIT 300`
			)
			.all(...params) as unknown as {
			id: number;
			date: string;
			card_id: number;
			account_id: number;
			amount: number;
			card_name: string | null;
			account_name: string | null;
		}[]
	).map((r) => ({
		id: r.id,
		date: r.date,
		cardId: r.card_id,
		cardName: r.card_name ?? '삭제된 카드',
		accountId: r.account_id,
		accountName: r.account_name ?? '삭제된 통장',
		amount: r.amount
	}));
}

/** 송금 기록 검색 — 기간·통장(보내거나 받는)·금액 범위·통장 이름 */
export function searchTransfers(f: {
	q?: string;
	methodId?: number;
	from?: string;
	to?: string;
	min?: number;
	max?: number;
	sort: EntrySort;
}): Transfer[] {
	const where: string[] = [];
	const params: (string | number)[] = [];
	if (f.q) {
		const like = `%${f.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
		where.push("(a.name LIKE ? ESCAPE '\\' OR b.name LIKE ? ESCAPE '\\' OR '송금' LIKE ? ESCAPE '\\')");
		params.push(like, like, like);
	}
	if (f.methodId !== undefined) {
		where.push('(t.from_id = ? OR t.to_id = ?)');
		params.push(f.methodId, f.methodId);
	}
	if (f.from) {
		where.push('t.date >= ?');
		params.push(f.from);
	}
	if (f.to) {
		where.push('t.date <= ?');
		params.push(f.to);
	}
	if (f.min !== undefined) {
		where.push('t.amount >= ?');
		params.push(f.min);
	}
	if (f.max !== undefined) {
		where.push('t.amount <= ?');
		params.push(f.max);
	}
	const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
	const order = SORT_SQL[f.sort].replace(/e\./g, 't.');
	return (
		getDb()
			.prepare(
				`SELECT t.id, t.date, t.from_id, t.to_id, t.amount, a.name AS from_name, b.name AS to_name
				   FROM transfers t
				   LEFT JOIN payment_methods a ON a.id = t.from_id
				   LEFT JOIN payment_methods b ON b.id = t.to_id
				   ${clause} ORDER BY ${order} LIMIT 300`
			)
			.all(...params) as unknown as {
			id: number;
			date: string;
			from_id: number;
			to_id: number;
			amount: number;
			from_name: string | null;
			to_name: string | null;
		}[]
	).map((r) => ({
		id: r.id,
		date: r.date,
		fromId: r.from_id,
		fromName: r.from_name ?? '삭제된 통장',
		toId: r.to_id,
		toName: r.to_name ?? '삭제된 통장',
		amount: r.amount
	}));
}

/** 메모·분류 검색어, 종류·분류·결제수단·기간·금액 범위로 내역을 찾는다 */
export function searchEntries(f: EntryFilter, limit = 300): EntrySearchResult {
	const db = getDb();
	const where: string[] = [];
	const params: (string | number)[] = [];

	if (f.q) {
		const like = `%${f.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
		where.push("(e.memo LIKE ? ESCAPE '\\' OR e.category LIKE ? ESCAPE '\\')");
		params.push(like, like);
	}
	if (f.kind) {
		where.push('e.kind = ?');
		params.push(f.kind);
	}
	if (f.categories?.length) {
		where.push(`e.category IN (${f.categories.map(() => '?').join(', ')})`);
		params.push(...f.categories);
	}
	if (f.methodKind) {
		where.push('e.method_id IN (SELECT id FROM payment_methods WHERE kind = ?)');
		params.push(f.methodKind);
	}
	if (f.methodId !== undefined) {
		where.push('e.method_id = ?');
		params.push(f.methodId);
	}
	if (f.from) {
		where.push('e.date >= ?');
		params.push(f.from);
	}
	if (f.to) {
		where.push('e.date <= ?');
		params.push(f.to);
	}
	if (f.min !== undefined) {
		where.push('e.amount >= ?');
		params.push(f.min);
	}
	if (f.max !== undefined) {
		where.push('e.amount <= ?');
		params.push(f.max);
	}
	if (f.nature) {
		where.push(
			"e.kind = 'spend' AND e.category IN (SELECT name FROM categories WHERE kind = 'spend' AND nature = ?)"
		);
		params.push(f.nature);
	}
	if (f.source === 'fixed') where.push("e.source LIKE 'fixed:%'");
	if (f.source === 'manual') where.push("e.source NOT LIKE 'fixed:%'");
	if (f.source === 'installment') where.push("e.kind = 'spend' AND e.installments > 1");
	const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

	const raw = db
		.prepare(
			`SELECT e.*, m.name AS method_name, g.name AS goal_name
			   FROM entries e
			   LEFT JOIN payment_methods m ON m.id = e.method_id
			   LEFT JOIN savings_goals g ON g.id = e.goal_id
			   ${clause}
			   ORDER BY ${SORT_SQL[f.sort]}
			   LIMIT ${Math.floor(limit)}`
		)
		.all(...params) as unknown as {
		id: number;
		date: string;
		kind: Kind;
		amount: number;
		category: string;
		memo: string;
		source: string;
		method_id: number | null;
		goal_id: number | null;
		method_name: string | null;
		goal_name: string | null;
		installments: number;
	}[];

	const sums = db
		.prepare(
			`SELECT e.kind AS kind, COUNT(*) AS n, SUM(e.amount) AS s FROM entries e ${clause} GROUP BY e.kind`
		)
		.all(...params) as unknown as { kind: Kind; n: number; s: number }[];
	const result: EntrySearchResult = {
		rows: raw.map((r) => ({
			id: r.id,
			date: r.date,
			kind: r.kind,
			amount: r.amount,
			category: r.category,
			memo: r.memo,
			source: r.source,
			methodId: r.method_id,
			methodName: r.method_name,
			goalId: r.goal_id,
			goalName: r.goal_name,
			installments: r.installments ?? 1
		})),
		count: 0,
		spend: 0,
		income: 0,
		save: 0,
		byCategory: (
			db
				.prepare(
					`SELECT e.category AS name, e.kind AS kind, COUNT(*) AS n, SUM(e.amount) AS s
					   FROM entries e ${clause} GROUP BY e.category, e.kind ORDER BY s DESC LIMIT 16`
				)
				.all(...params) as unknown as { name: string; kind: Kind; n: number; s: number }[]
		).map((c) => ({ name: c.name, kind: c.kind, count: c.n, sum: c.s }))
	};
	for (const r of sums) {
		result.count += r.n;
		result[r.kind] = r.s;
	}
	return result;
}
