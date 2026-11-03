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
	Category,
	BudgetInfo,
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

function getDb(): DatabaseSync {
	if (db) return db;
	fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
	db = new DatabaseSync(DB_PATH);
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
}

/** 기본 카테고리·결제수단·목표를 채운다(없는 것만 — 신규 시드와 기존 DB 모두에서 안전) */
export function ensureBuiltinData(): void {
	const db = getDb();
	const insCat = db.prepare(
		'INSERT INTO categories (kind, name, color, builtin, position) VALUES (?, ?, ?, 1, ?)'
	);
	// 기본 분류의 색은 코드의 정의를 따른다(사용자가 만든 분류는 건드리지 않는다)
	const syncColor = db.prepare(
		'UPDATE categories SET color = ? WHERE kind = ? AND name = ? AND builtin = 1'
	);
	let pos = 0;
	for (const c of EXPENSE_CATEGORIES) {
		const r = db.prepare('SELECT 1 FROM categories WHERE kind=? AND name=?').get('spend', c.name);
		if (!r) insCat.run('spend', c.name, c.color, pos++);
		else syncColor.run(c.color, 'spend', c.name);
	}
	pos = 0;
	for (const n of INCOME_CATEGORIES) {
		const r = db.prepare('SELECT 1 FROM categories WHERE kind=? AND name=?').get('income', n);
		if (!r) insCat.run('income', n, INCOME_COLOR, pos++);
		else syncColor.run(INCOME_COLOR, 'income', n);
	}
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
		'DELETE FROM fixed_log; DELETE FROM entries; DELETE FROM fixed_defs; DELETE FROM month_start;'
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
	db.prepare('INSERT INTO month_start (month, amount) VALUES (?, ?)').run(prevMonth, 2_450_000);
	db.prepare('INSERT INTO month_start (month, amount) VALUES (?, ?)').run(nowMonth, 2_600_000);

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
			insertEntry(`${month}-25`, 'income', 3_100_000, '월급', '월급 입금');
		}
		if (month === nowMonth && lastDay >= 2) {
			insertEntry(`${month}-02`, 'income', 200_000, '용돈', '부모님 용돈');
		}
		if (month === nowMonth && lastDay >= 8) {
			insertEntry(`${month}-08`, 'income', 63_000, '환급', '연말정산 환급');
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
			const row = db.prepare('SELECT COUNT(*) AS n FROM entries').get() as { n: number };
			if (row.n === 0) seed();
			else ensureBuiltinData();
			resolve();
		} catch (err) {
			reject(err);
		}
	});
	return seedPromise;
}

export function resetAndSeed(): void {
	seed();
}

/* ------------------------------------------------------------------ */
/* 질의                                                                 */
/* ------------------------------------------------------------------ */

function monthBounds(month: string): [string, string] {
	return [`${month}-01`, `${month}-${pad2(daysInMonthOf(month))}`];
}

export function setStartAmount(month: string, amount: number): void {
	getDb()
		.prepare(
			'INSERT INTO month_start (month, amount) VALUES (?, ?) ON CONFLICT(month) DO UPDATE SET amount = excluded.amount'
		)
		.run(month, amount);
}

export function addEntry(
	date: string,
	kind: Kind,
	amount: number,
	category: string,
	memo: string,
	methodId: number | null = null,
	goalId: number | null = null
): number {
	const res = getDb()
		.prepare(
			"INSERT INTO entries (date, kind, amount, category, memo, source, method_id, goal_id) VALUES (?, ?, ?, ?, ?, 'manual', ?, ?)"
		)
		.run(date, kind, amount, category, memo, methodId, goalId);
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
	goalId: number | null = null
): void {
	getDb()
		.prepare(
			'UPDATE entries SET date=?, kind=?, amount=?, category=?, memo=?, method_id=?, goal_id=? WHERE id=?'
		)
		.run(date, kind, amount, category, memo, methodId, goalId, id);
}

export function deleteEntry(id: number): void {
	getDb().prepare('DELETE FROM fixed_log WHERE entry_id = ?').run(id);
	getDb().prepare('DELETE FROM entries WHERE id = ?').run(id);
}

export function addFixed(name: string, day: number, amount: number, category: string): number {
	const res = getDb()
		.prepare('INSERT INTO fixed_defs (name, day, amount, category) VALUES (?, ?, ?, ?)')
		.run(name, day, amount, category);
	return Number(res.lastInsertRowid);
}

export function updateFixed(
	id: number,
	name: string,
	day: number,
	amount: number,
	category: string
): void {
	getDb()
		.prepare('UPDATE fixed_defs SET name=?, day=?, amount=?, category=? WHERE id=?')
		.run(name, day, amount, category, id);
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
		{ id: number; name: string; day: number; amount: number; category: string } | undefined;
	if (!def) return false;
	const done = db
		.prepare('SELECT 1 FROM fixed_log WHERE def_id = ? AND month = ?')
		.get(defId, month);
	if (done) return false;
	const day = Math.min(def.day, daysInMonthOf(month));
	const res = db
		.prepare(
			'INSERT INTO entries (date, kind, amount, category, memo, source) VALUES (?, ?, ?, ?, ?, ?)'
		)
		.run(`${month}-${pad2(day)}`, 'spend', def.amount, def.category, def.name, `fixed:${def.id}`);
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
				'SELECT id, kind, name, color, builtin, position FROM categories ORDER BY kind, position, id'
			)
			.all() as unknown as {
			id: number;
			kind: 'spend' | 'income';
			name: string;
			color: string;
			builtin: number;
			position: number;
		}[]
	).map((r) => ({
		id: r.id,
		kind: r.kind,
		name: r.name,
		color: r.color,
		builtin: r.builtin === 1,
		position: r.position
	}));
}

export function addCategory(kind: 'spend' | 'income', name: string, color: string): number {
	const db = getDb();
	const r = db
		.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM categories WHERE kind = ?')
		.get(kind) as { p: number };
	const res = db
		.prepare('INSERT INTO categories (kind, name, color, builtin, position) VALUES (?, ?, ?, 0, ?)')
		.run(kind, name, color, r.p);
	return Number(res.lastInsertRowid);
}

export function updateCategory(id: number, name: string, color: string): void {
	const db = getDb();
	const cat = db.prepare('SELECT name, kind FROM categories WHERE id = ?').get(id) as
		{ name: string; kind: 'spend' | 'income' } | undefined;
	if (!cat) return;
	db.prepare('UPDATE categories SET name = ?, color = ? WHERE id = ?').run(name, color, id);
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
	const start = db.prepare('SELECT amount FROM month_start WHERE month = ?').get(month) as
		{ amount: number } | undefined;
	if (!start) return null;
	const [from, to] = monthBounds(month);
	const rows = db
		.prepare('SELECT kind, SUM(amount) AS s FROM entries WHERE date BETWEEN ? AND ? GROUP BY kind')
		.all(from, to) as unknown as { kind: Kind; s: number }[];
	let balance = start.amount;
	for (const r of rows) balance += r.kind === 'income' ? r.s : -r.s;
	return balance;
}

export function listPaymentMethods(): PaymentMethod[] {
	return getDb()
		.prepare('SELECT id, kind, name, position FROM payment_methods ORDER BY position, id')
		.all() as unknown as PaymentMethod[];
}

export function addPaymentMethod(kind: 'card' | 'account', name: string): number {
	const db = getDb();
	const r = db
		.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM payment_methods WHERE kind = ?')
		.get(kind) as { p: number };
	const res = db
		.prepare('INSERT INTO payment_methods (kind, name, position) VALUES (?, ?, ?)')
		.run(kind, name, r.p);
	return Number(res.lastInsertRowid);
}

export function updatePaymentMethod(id: number, name: string): void {
	getDb().prepare('UPDATE payment_methods SET name = ? WHERE id = ?').run(name, id);
}

/** 사용 내역이 있으면 지울 수 없다 */
export function deletePaymentMethod(id: number): boolean {
	const db = getDb();
	const used = db.prepare('SELECT 1 FROM entries WHERE method_id = ? LIMIT 1').get(id);
	if (used) return false;
	db.prepare('DELETE FROM payment_methods WHERE id = ?').run(id);
	return true;
}

export function listSavingsGoals(): SavingsGoal[] {
	return (
		getDb()
			.prepare(
				'SELECT id, name, target_amount, end_month, position FROM savings_goals ORDER BY position, id'
			)
			.all() as unknown as {
			id: number;
			name: string;
			target_amount: number;
			end_month: string;
			position: number;
		}[]
	).map((r) => ({
		id: r.id,
		name: r.name,
		targetAmount: r.target_amount,
		endMonth: r.end_month,
		position: r.position
	}));
}

export function addSavingsGoal(name: string, targetAmount: number, endMonth: string): number {
	const db = getDb();
	const r = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM savings_goals').get() as {
		p: number;
	};
	const res = db
		.prepare(
			'INSERT INTO savings_goals (name, target_amount, end_month, position) VALUES (?, ?, ?, ?)'
		)
		.run(name, targetAmount, endMonth, r.p);
	return Number(res.lastInsertRowid);
}

export function updateSavingsGoal(
	id: number,
	name: string,
	targetAmount: number,
	endMonth: string
): void {
	getDb()
		.prepare('UPDATE savings_goals SET name = ?, target_amount = ?, end_month = ? WHERE id = ?')
		.run(name, targetAmount, endMonth, id);
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
		goalName: r.goal_name
	}));

	const fixedDefs = (
		db.prepare('SELECT * FROM fixed_defs ORDER BY day, id').all() as unknown as FixedDef[]
	).map((d) => ({ ...d }));
	const recordedRows = db
		.prepare('SELECT def_id FROM fixed_log WHERE month = ?')
		.all(month) as unknown as { def_id: number }[];
	const recordedFixedIds = recordedRows.map((r) => r.def_id);

	const today = new Date();
	const todayStr = dateKey(today);
	const todayInMonth = monthKey(today) === month;

	const startRow = db.prepare('SELECT amount FROM month_start WHERE month = ?').get(month) as
		{ amount: number } | undefined;
	const startAmount = startRow?.amount ?? null;

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
	const balance = startAmount === null ? null : startAmount + incomeTotal - spendTotal - saveTotal;

	// 잔액 곡선 — 지나간 날만 실제 값, 미래는 오늘 값 유지
	const route: RoutePoint[] = [];
	const start0 = startAmount ?? 0;
	let running = start0;
	const fixedDays = new Set(byDay.filter((c) => c.fixed > 0).map((c) => c.day));
	for (const cell of byDay) {
		if (cell.date <= todayStr) {
			running =
				start0 + byDay.slice(0, cell.day).reduce((s, c) => s + c.income - c.spend - c.save, 0);
		}
		route.push({
			day: cell.day,
			date: cell.date,
			balance: cell.date <= todayStr ? running : start0 + incomeTotal - spendTotal - saveTotal,
			hasFixed: fixedDays.has(cell.day)
		});
	}

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
		const saved = goalSumMap.get(g.id) ?? 0;
		const monthsLeft = monthsBetween(month, g.endMonth) + 1; // 이 달 포함
		const left = Math.max(0, g.targetAmount - (beforeMap.get(g.id) ?? 0));
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

export type EntrySort = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';

export interface EntryFilter {
	q?: string;
	kind?: Kind;
	category?: string;
	methodId?: number;
	from?: string;
	to?: string;
	min?: number;
	max?: number;
	source?: 'fixed' | 'manual';
	sort: EntrySort;
}

export interface EntrySearchResult {
	rows: Entry[];
	count: number; // 조건에 맞는 전체 건수(rows 는 limit 까지만)
	spend: number;
	income: number;
	save: number;
}

const SORT_SQL: Record<EntrySort, string> = {
	date_desc: 'e.date DESC, e.id DESC',
	date_asc: 'e.date ASC, e.id ASC',
	amount_desc: 'e.amount DESC, e.date DESC',
	amount_asc: 'e.amount ASC, e.date DESC'
};

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
	if (f.category) {
		where.push('e.category = ?');
		params.push(f.category);
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
	if (f.source === 'fixed') where.push("e.source LIKE 'fixed:%'");
	if (f.source === 'manual') where.push("e.source NOT LIKE 'fixed:%'");
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
			goalName: r.goal_name
		})),
		count: 0,
		spend: 0,
		income: 0,
		save: 0
	};
	for (const r of sums) {
		result.count += r.n;
		result[r.kind] = r.s;
	}
	return result;
}
