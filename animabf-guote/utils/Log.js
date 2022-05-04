export const Log = {
    log(...args) {
        // eslint-disable-next-line no-console
        console.log('animabf-guote |', ...args);
    },
    warn(...args) {
        // eslint-disable-next-line no-console
        console.warn('animabf-guote |', ...args);
    },
    error(...args) {
        // eslint-disable-next-line no-console
        console.error('animabf-guote |', ...args);
    }
};
