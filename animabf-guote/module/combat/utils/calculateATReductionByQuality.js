export const calculateATReductionByQuality = (quality) => {
    if (quality <= 0) {
        return 0;
    }
    return Math.round(quality / 5);
};
