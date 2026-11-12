import type { Actions, PageServerLoad } from './$types';
import * as db from '#lib/server/db';
import { ledgerActions, loadMonth } from '#lib/server/ledgerActions';

export const load: PageServerLoad = async ({ url, parent }) => {
	await db.ensureSeeded();
	const { month } = await parent();
	return loadMonth(month, url);
};

export const actions: Actions = ledgerActions;
