import type { PageServerLoad } from './$types';
import * as db from '#lib/server/db';

export const load: PageServerLoad = async () => {
	await db.ensureSeeded();
	return db.getAssets();
};
