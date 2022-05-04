export const isHBSHelper = {
    name: 'is',
    fn: (op, val1, val2, options) => {
        const getTruthyFn = () => {
            return options.fn?.(this) ?? true;
        };
        const getFalsyFn = () => {
            return options.inverse?.(this) ?? false;
        };
        if (op === 'neq') {
            return val1 != val2 ? getTruthyFn() : getFalsyFn();
        }
        if (op === 'eq') {
            return val1 == val2 ? getTruthyFn() : getFalsyFn();
        }
        if (op === 'gt') {
            return val1 > val2 ? getTruthyFn() : getFalsyFn();
        }
        if (op === 'gte') {
            return val1 >= val2 ? getTruthyFn() : getFalsyFn();
        }
        if (op === 'lt') {
            return val1 < val2 ? getTruthyFn() : getFalsyFn();
        }
        if (op === 'lte') {
            return val1 <= val2 ? getTruthyFn() : getFalsyFn();
        }
        throw new Error(`Unknown operator (${op})`);
    }
};
