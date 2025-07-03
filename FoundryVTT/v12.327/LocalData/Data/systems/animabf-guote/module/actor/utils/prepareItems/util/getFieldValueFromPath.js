const getFieldValueFromPath = (data, fieldPath) => {
  let field = data;
  for (const path of fieldPath) {
    field = field[path];
  }
  return field;
};
export {
  getFieldValueFromPath
};
