const getUpdateObjectFromPath = (value, fieldPath) => {
  const result = {};
  fieldPath.reduce((prev, curr, index) => {
    if (index === fieldPath.length - 1) {
      return prev[curr] = value;
    }
    return prev[curr] = {};
  }, result);
  return result;
};
export {
  getUpdateObjectFromPath
};
