import type { PageServerLoad } from './$types';
import * as db from '#lib/server/db';

export const load: PageServerLoad = async ({ parent }) => {
	await db.ensureSeeded();
	const { month } = await parent();
	return db.getMonthData(month, 1);
};
