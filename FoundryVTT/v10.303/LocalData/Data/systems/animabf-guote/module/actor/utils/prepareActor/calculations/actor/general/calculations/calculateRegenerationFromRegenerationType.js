export const calculateRegenerationFromRegenerationType = (regenerationType) => {
  // CON = regenerationType (1:1 mapping after calculateRegenerationTypeFromConstitution)
  // Returns [resting, normal, recovery] where normal=null means equals resting.
  // Recovery values are negative (reduction of negative physical modifiers per period).
  switch (regenerationType) {
    case 0:
    case 1:
    case 2:
    case 3:
      return [
        { value: 0, period: "d" },
        { value: 0, period: "d" },
        { value: 0, period: "d" },
      ];
    case 4:
      return [{ value: 15, period: "d" }, null, { value: -5, period: "d" }];
    case 5:
      return [{ value: 20, period: "d" }, null, { value: -10, period: "d" }];
    case 6:
      return [{ value: 25, period: "d" }, null, { value: -10, period: "d" }];
    case 7:
      return [{ value: 30, period: "d" }, null, { value: -15, period: "d" }];
    case 8:
      return [{ value: 30, period: "d" }, null, { value: -15, period: "d" }];
    case 9:
      return [{ value: 35, period: "d" }, null, { value: -15, period: "d" }];
    case 10:
      return [{ value: 40, period: "d" }, null, { value: -20, period: "d" }];
    case 11:
      return [{ value: 2, period: "h" }, null, { value: -15, period: "d" }];
    case 12:
      return [{ value: 5, period: "h" }, null, { value: -20, period: "d" }];
    case 13:
      return [{ value: 10, period: "h" }, null, { value: -20, period: "d" }];
    case 14:
      return [{ value: 2, period: "m" }, null, { value: -1, period: "h" }];
    case 15:
      return [{ value: 5, period: "m" }, null, { value: -2, period: "h" }];
    case 16:
      return [{ value: 10, period: "m" }, null, { value: -5, period: "h" }];
    case 17:
      return [{ value: 20, period: "m" }, null, { value: -10, period: "h" }];
    case 18:
      return [{ value: 50, period: "m" }, null, { value: -25, period: "h" }];
    case 19:
      return [{ value: 100, period: "m" }, null, { value: -50, period: "h" }];
    default:
      return [{ value: 200, period: "m" }, null, { value: -100, period: "h" }];
  }
};

/* 
switch (regenerationType) {
        case 0:
            return [
                {
                    value: 0,
                    period: 'd'
                },
                {
                    value: 0,
                    period: 'd'
                },
                {
                    value: 0,
                    period: 'd'
                }
            ];
        case 1:
            return [
                {
                    value: 10,
                    period: 'd'
                },
                {
                    value: 5,
                    period: 'd'
                },
                {
                    value: -5,
                    period: 'd'
                }
            ];
        case 2:
            return [
                {
                    value: 20,
                    period: 'd'
                },
                {
                    value: 10,
                    period: 'd'
                },
                {
                    value: -5,
                    period: 'd'
                }
            ];
        case 3:
            return [
                {
                    value: 30,
                    period: 'd'
                },
                {
                    value: 15,
                    period: 'd'
                },
                {
                    value: -5,
                    period: 'd'
                }
            ];
        case 4:
            return [
                {
                    value: 40,
                    period: 'd'
                },
                {
                    value: 20,
                    period: 'd'
                },
                {
                    value: -10,
                    period: 'd'
                }
            ];
        case 5:
            return [
                {
                    value: 50,
                    period: 'd'
                },
                {
                    value: 25,
                    period: 'd'
                },
                {
                    value: -10,
                    period: 'd'
                }
            ];
        case 6:
            return [
                {
                    value: 75,
                    period: 'd'
                },
                {
                    value: 30,
                    period: 'd'
                },
                {
                    value: -15,
                    period: 'd'
                }
            ];
        case 7:
            return [
                {
                    value: 100,
                    period: 'd'
                },
                {
                    value: 50,
                    period: 'd'
                },
                {
                    value: -20,
                    period: 'd'
                }
            ];
        case 8:
            return [
                {
                    value: 250,
                    period: 'd'
                },
                {
                    value: 100,
                    period: 'd'
                },
                {
                    value: -25,
                    period: 'd'
                }
            ];
        case 9:
            return [
                {
                    value: 500,
                    period: 'd'
                },
                {
                    value: 200,
                    period: 'd'
                },
                {
                    value: -30,
                    period: 'd'
                }
            ];
        case 10:
            return [
                {
                    value: 1,
                    period: 'm'
                },
                null,
                {
                    value: -40,
                    period: 'd'
                }
            ];
        case 11:
            return [
                {
                    value: 2,
                    period: 'm'
                },
                null,
                {
                    value: -50,
                    period: 'd'
                }
            ];
        case 12:
            return [
                {
                    value: 5,
                    period: 'm'
                },
                null,
                {
                    value: -5,
                    period: 'h'
                }
            ];
        case 13:
            return [
                {
                    value: 10,
                    period: 'm'
                },
                null,
                {
                    value: -10,
                    period: 'h'
                }
            ];
        case 14:
            return [
                {
                    value: 1,
                    period: 'a'
                },
                null,
                {
                    value: -15,
                    period: 'h'
                }
            ];
        case 15:
            return [
                {
                    value: 5,
                    period: 'a'
                },
                null,
                {
                    value: -20,
                    period: 'h'
                }
            ];
        case 16:
            return [
                {
                    value: 10,
                    period: 'a'
                },
                null,
                {
                    value: -10,
                    period: 'm'
                }
            ];
        case 17:
            return [
                {
                    value: 25,
                    period: 'a'
                },
                null,
                {
                    value: -10,
                    period: 'a'
                }
            ];
        case 18:
            return [
                {
                    value: 50,
                    period: 'a'
                },
                null,
                {
                    value: -25,
                    period: 'a'
                }
            ];
        case 19:
            return [
                {
                    value: 100,
                    period: 'a'
                },
                null,
                {
                    value: -9999,
                    period: 'a'
                }
            ];
        default:
            return [
                {
                    value: 250,
                    period: 'a'
                },
                null,
                {
                    value: -9999,
                    period: 'a'
                }
            ];
    } */
