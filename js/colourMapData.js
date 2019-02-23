// https://github.com/matplotlib/matplotlib/blob/master/lib/matplotlib/_cm.py

const gnuplotPaletteFunctions = [
    /* 0  */ x => 0,
    /* 1  */ x => 0.5,
    /* 2  */ x => 1,
    /* 3  */ x => x,
    /* 4  */ x => Math.pow(x, 2),
    /* 5  */ x => Math.pow(x, 3),
    /* 6  */ x => Math.pow(x, 4),
    /* 7  */ x => Math.sqrt(x),
    /* 8  */ x => Math.sqrt(Math.sqrt(x)),
    /* 9  */ x => Math.sin(x * Math.PI / 2),
    /* 10 */ x => Math.cos(x * Math.PI / 2),
    /* 11 */ x => Math.abs(x - 0.5),
    /* 12 */ x => Math.pow(2 * x - 1, 2),
    /* 13 */ x => Math.sin(x * Math.PI),
    /* 14 */ x => Math.abs(Math.cos(x * Math.PI)),
    /* 15 */ x => Math.sin(x * 2 * Math.PI),
    /* 16 */ x => Math.cos(x * 2 * Math.PI),
    /* 17 */ x => Math.abs(Math.sin(x * 2 * Math.PI)),
    /* 18 */ x => Math.abs(Math.cos(x * 2 * Math.PI)),
    /* 19 */ x => Math.abs(Math.sin(x * 4 * Math.PI)),
    /* 20 */ x => Math.abs(Math.cos(x * 4 * Math.PI)),
    /* 21 */ x => 3 * x,
    /* 22 */ x => 3 * x - 1,
    /* 23 */ x => 3 * x - 2,
    /* 24 */ x => Math.abs(3 * x - 1),
    /* 25 */ x => Math.abs(3 * x - 2),
    /* 26 */ x => (3 * x - 1) / 2,
    /* 27 */ x => (3 * x - 2) / 2,
    /* 28 */ x => Math.abs((3 * x - 1) / 2),
    /* 29 */ x => Math.abs((3 * x - 2) / 2),
    /* 30 */ x => x / 0.32 - 0.78125,
    /* 31 */ x => 2 * x - 0.84,
    /* 32 */ x => x < 0.25 ? 4 * x : x < 0.92 ? -2 * x + 1.84 : x / 0.08 - 11.5,
    /* 33 */ x => Math.abs(2 * x - 0.5),
    /* 34 */ x => 2 * x,
    /* 35 */ x => 2 * x - 0.5,
    /* 36 */ x => 2 * x - 1
]

const JET_DATA = {
  usesFuncs: false,
  red: [
    [0, 0, 0],
    [0.35, 0, 0],
    [0.66, 1, 1],
    [0.89, 1, 1],
    [1, 0.5, 0.5]
  ],
  green: [
    [0, 0, 0],
    [0.125, 0, 0],
    [0.375, 1, 1],
    [0.64, 1, 1],
    [0.91, 0, 0],
    [1, 0, 0]
  ],
  blue: [
    [0, 0.5, 0.5],
    [0.11, 1, 1],
    [0.34, 1, 1],
    [0.65, 0, 0],
    [1, 0, 0]
  ]
}

const GIST_STERN_DATA = {
  usesFuncs: false,
  red: [
    [0, 0, 0],
    [0.0547, 1, 1],
    [0.250, 0.027, 0.250],
    [1, 1, 1]
  ],
  green: [
    [0, 0, 0],
    [1, 0, 0]
  ],
  blue: [
    [0, 0, 0],
    [0.5, 1, 1],
    [0.735, 0, 0],
    [1, 0, 0]
  ]
}

const CMRMAP_DATA = {
  usesFuncs: false,
  red: [
    [0.000, 0.00, 0.00],
    [0.125, 0.15, 0.15],
    [0.250, 0.30, 0.30],
    [0.375, 0.60, 0.60],
    [0.500, 1.00, 1.00],
    [0.625, 0.90, 0.90],
    [0.750, 0.90, 0.90],
    [0.875, 0.90, 0.90],
    [1.000, 1.00, 1.00]
  ],
  green: [
    [0.000, 0.00, 0.00],
    [0.125, 0.15, 0.15],
    [0.250, 0.15, 0.15],
    [0.375, 0.20, 0.20],
    [0.500, 0.25, 0.25],
    [0.625, 0.50, 0.50],
    [0.750, 0.75, 0.75],
    [0.875, 0.90, 0.90],
    [1.000, 1.00, 1.00]
  ],
  blue: [
    [0.000, 0.00, 0.00],
    [0.125, 0.50, 0.50],
    [0.250, 0.75, 0.75],
    [0.375, 0.50, 0.50],
    [0.500, 0.15, 0.15],
    [0.625, 0.00, 0.00],
    [0.750, 0.10, 0.10],
    [0.875, 0.50, 0.50],
    [1.000, 1.00, 1.00]
  ]
}

const OCEAN_DATA = {
  usesFuncs: true,
  red: gnuplotPaletteFunctions[23],
  green: gnuplotPaletteFunctions[28],
  blue: gnuplotPaletteFunctions[3]
}

const RAINBOW_DATA = {
  usesFuncs: true,
  red: gnuplotPaletteFunctions[33],
  green: gnuplotPaletteFunctions[13],
  blue: gnuplotPaletteFunctions[10]
}

const GNUPLOT_DATA = {
  usesFuncs: true,
  red: gnuplotPaletteFunctions[7],
  green: gnuplotPaletteFunctions[5],
  blue: gnuplotPaletteFunctions[15]
}

const GNUPLOT2_DATA = {
  usesFuncs: true,
  red: gnuplotPaletteFunctions[30],
  green: gnuplotPaletteFunctions[31],
  blue: gnuplotPaletteFunctions[32]
}

export const colourMapDictionary = {
  'jet': JET_DATA,
  'gist_stern': GIST_STERN_DATA,
  'CMRmap': CMRMAP_DATA,
  'ocean': OCEAN_DATA,
  'rainbow': RAINBOW_DATA,
  'gnuplot': GNUPLOT_DATA,
  'gnuplot2': GNUPLOT2_DATA
}
