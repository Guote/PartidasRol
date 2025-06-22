import { migrateToV1 } from './migrateToV1.js';
export const migrateItem = item => {
    return migrateToV1(item);
};
