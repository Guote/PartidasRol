export const getFormula = ({
  dice = "1d100xa",
  values = [],
  labels = [""],
}) => {
  let formula = `${dice}`;

  for (let i = 0; i < values.length; i++) {
    let value = parseInt(values[i]);
    if (value === 0 || isNaN(value)) continue;

    formula = `
        ${formula} ${value > 0 ? "+" : ""}
        ${value}${labels?.[i] ? `[ ${labels[i]} ]` : ""}`;
  }
  console.log("formula", formula);
  return formula;
};
