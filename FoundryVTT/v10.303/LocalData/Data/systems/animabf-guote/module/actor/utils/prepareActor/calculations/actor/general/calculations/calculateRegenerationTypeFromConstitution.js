export const calculateRegenerationTypeFromConstitution = constitution => {
    return Math.max(0, Math.min(20, constitution || 0));
};
