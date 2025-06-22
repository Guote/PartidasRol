const service = () => {
    let nextValue;
    return {
        setNextValue(value) {
            nextValue = value;
        },
        getNextValue() {
            return nextValue;
        }
    };
};
export const nextValueService = service();
