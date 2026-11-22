import Decimal from 'decimal.js';
import {
  AngleConversionResult,
  DMSComponents,
  PhaseSignType,
  SinusoidalAnalyticalResult,
  SinusoidalInputParams,
  WaveFunctionType,
  WaveformPlotPoint,
} from './types';

// Configure Decimal.js with 50 significant digits to eliminate IEEE 754 drift
Decimal.set({ precision: 50, rounding: Decimal.ROUND_HALF_UP });

const DECIMAL_PI = new Decimal(
  '3.14159265358979323846264338327950288419716939937510'
);

const DECIMAL_E = new Decimal(
  '2.71828182845904523536028747135266249775724709369995'
);

export type CalculatorAngleUnit = 'DEG' | 'RAD';

/**
 * Greatest Common Divisor for positive integers
 */
export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

/**
 * Positive Euclidean modulo 2π: ((x % 2π) + 2π) % 2π
 */
export function positiveModulo2Pi(x: number): number {
  const twoPi = 2 * Math.PI;
  const mod = ((x % twoPi) + twoPi) % twoPi;
  return Math.abs(mod - twoPi) < 1e-12 ? 0 : mod;
}

// ============================================================================
// 1. EXACT DECIMAL.JS SCIENTIFIC ENGINE (Tab 1 Scientific Calculator & Parser)
// ============================================================================

type TokenType =
  | 'NUMBER'
  | 'CONST'
  | 'ANS'
  | 'FUNC'
  | 'OP'
  | 'POSTFIX'
  | 'LPAREN'
  | 'RPAREN';

interface Token {
  type: TokenType;
  value: string;
}

const SCIENTIFIC_FUNCTIONS = new Set([
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'arcsin',
  'arccos',
  'arctan',
  'sinh',
  'cosh',
  'tanh',
  'ln',
  'log',
  'log10',
  'exp',
  'sqrt',
  'cbrt',
  'abs',
  'rad',
  'deg',
]);

/**
 * Tokenizes a scientific arithmetic or symbolic-π expression string.
 * Supports:
 * - Basic operators: +, -, *, ×, /, ÷, ^, mod
 * - Postfix operators: ! (factorial), % (percent), ² (square), ³ (cube)
 * - Prefix root symbols: √ (sqrt), ∛ (cbrt)
 * - Scientific functions: sin, cos, tan, asin, acos, atan, sinh, cosh, tanh,
 *   ln, log, log10, exp, sqrt, cbrt, abs, rad, deg
 * - Constants: π, pi, e, Ans
 * - Automatically inserts implicit multiplication (e.g., "3π" -> "3 * π", "2sin(30)" -> "2 * sin(30)").
 */
function tokenizeExpression(raw: string): Token[] {
  const cleaned = raw
    .trim()
    .replace(/rad\/s/gi, '')
    .replace(/\brad\b(?!\s*\()/gi, '')
    .replace(/°/g, '')
    .replace(/,/g, '.')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .trim();

  if (!cleaned) {
    throw new Error('Input ekspresi kosong.');
  }

  const rawTokens: Token[] = [];
  let i = 0;

  while (i < cleaned.length) {
    const ch = cleaned[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (/[0-9.]/.test(ch)) {
      let numStr = '';
      let dotCount = 0;
      while (i < cleaned.length && /[0-9.]/.test(cleaned[i])) {
        if (cleaned[i] === '.') {
          dotCount++;
          if (dotCount > 1) {
            throw new Error(`Format angka desimal tidak valid pada "${numStr}."`);
          }
        }
        numStr += cleaned[i];
        i++;
      }
      if (numStr === '.') {
        throw new Error('Titik desimal tanpa angka tidak valid.');
      }
      rawTokens.push({ type: 'NUMBER', value: numStr });
      continue;
    }

    if (ch === 'π') {
      rawTokens.push({ type: 'CONST', value: 'π' });
      i++;
      continue;
    }

    if (ch === '√') {
      rawTokens.push({ type: 'FUNC', value: 'sqrt' });
      i++;
      continue;
    }

    if (ch === '∛') {
      rawTokens.push({ type: 'FUNC', value: 'cbrt' });
      i++;
      continue;
    }

    if (ch === '²' || ch === '³' || ch === '!' || ch === '%') {
      rawTokens.push({ type: 'POSTFIX', value: ch });
      i++;
      continue;
    }

    if (/[a-zA-Z]/.test(ch)) {
      let ident = '';
      while (i < cleaned.length && /[a-zA-Z0-9]/.test(cleaned[i])) {
        ident += cleaned[i];
        i++;
      }
      const lower = ident.toLowerCase();

      if (lower === 'pi') {
        rawTokens.push({ type: 'CONST', value: 'π' });
        continue;
      }
      if (lower === 'e') {
        rawTokens.push({ type: 'CONST', value: 'e' });
        continue;
      }
      if (lower === 'ans') {
        rawTokens.push({ type: 'ANS', value: 'Ans' });
        continue;
      }
      if (lower === 'mod') {
        rawTokens.push({ type: 'OP', value: 'mod' });
        continue;
      }
      if (SCIENTIFIC_FUNCTIONS.has(lower)) {
        rawTokens.push({ type: 'FUNC', value: lower });
        continue;
      }

      throw new Error(`Fungsi atau simbol tidak dikenali: "${ident}"`);
    }

    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^') {
      rawTokens.push({ type: 'OP', value: ch });
      i++;
      continue;
    }

    if (ch === '(') {
      rawTokens.push({ type: 'LPAREN', value: '(' });
      i++;
      continue;
    }

    if (ch === ')') {
      rawTokens.push({ type: 'RPAREN', value: ')' });
      i++;
      continue;
    }

    throw new Error(`Karakter tidak dikenali: "${ch}"`);
  }

  // Insert implicit multiplication tokens where appropriate:
  // e.g., NUMBER/CONST/ANS/RPAREN/POSTFIX followed by CONST/ANS/FUNC/LPAREN/NUMBER
  const tokens: Token[] = [];
  for (let idx = 0; idx < rawTokens.length; idx++) {
    const curr = rawTokens[idx];
    tokens.push(curr);

    if (idx + 1 < rawTokens.length) {
      const next = rawTokens[idx + 1];
      const currIsValue =
        curr.type === 'NUMBER' ||
        curr.type === 'CONST' ||
        curr.type === 'ANS' ||
        curr.type === 'RPAREN' ||
        curr.type === 'POSTFIX';
      const nextStartsValue =
        next.type === 'CONST' ||
        next.type === 'ANS' ||
        next.type === 'FUNC' ||
        next.type === 'LPAREN' ||
        (curr.type !== 'NUMBER' && next.type === 'NUMBER');

      if (currIsValue && nextStartsValue) {
        tokens.push({ type: 'OP', value: '*' });
      }
    }
  }

  return tokens;
}

function computeFactorial(val: Decimal): Decimal {
  if (!val.isInteger() || val.isNegative()) {
    throw new Error('Faktorial (n!) hanya untuk bilangan bulat n ≥ 0.');
  }
  const n = val.toNumber();
  if (n > 170) {
    throw new Error('Faktorial terlalu besar (maksimum 170!).');
  }
  let res = new Decimal(1);
  for (let k = 2; k <= n; k++) {
    res = res.times(k);
  }
  return res;
}

function applyScientificFunction(
  fn: string,
  arg: Decimal,
  angleUnit: CalculatorAngleUnit
): Decimal {
  const toRadians = (val: Decimal) =>
    angleUnit === 'DEG' ? val.times(DECIMAL_PI).dividedBy(180) : val;
  const fromRadians = (rad: Decimal) =>
    angleUnit === 'DEG' ? rad.times(180).dividedBy(DECIMAL_PI) : rad;

  switch (fn) {
    case 'sin': {
      const rad = toRadians(arg);
      const res = rad.sin();
      return res.abs().lessThan('1e-14') ? new Decimal(0) : res;
    }
    case 'cos': {
      const rad = toRadians(arg);
      const res = rad.cos();
      return res.abs().lessThan('1e-14') ? new Decimal(0) : res;
    }
    case 'tan': {
      const rad = toRadians(arg);
      const cosVal = rad.cos();
      if (cosVal.abs().lessThan('1e-14')) {
        throw new Error('Tak terdefinisi (Asimtot tan 90° / π/2).');
      }
      const sinVal = rad.sin();
      return sinVal.abs().lessThan('1e-14')
        ? new Decimal(0)
        : sinVal.dividedBy(cosVal);
    }
    case 'asin':
    case 'arcsin': {
      if (arg.abs().greaterThan(1)) {
        throw new Error('Domain asin(x) harus berada pada [-1, 1].');
      }
      return fromRadians(arg.asin());
    }
    case 'acos':
    case 'arccos': {
      if (arg.abs().greaterThan(1)) {
        throw new Error('Domain acos(x) harus berada pada [-1, 1].');
      }
      return fromRadians(arg.acos());
    }
    case 'atan':
    case 'arctan': {
      return fromRadians(arg.atan());
    }
    case 'sinh':
      return arg.sinh();
    case 'cosh':
      return arg.cosh();
    case 'tanh':
      return arg.tanh();
    case 'ln': {
      if (arg.lessThanOrEqualTo(0)) {
        throw new Error('Domain ln(x) harus lebih besar dari 0.');
      }
      return arg.ln();
    }
    case 'log':
    case 'log10': {
      if (arg.lessThanOrEqualTo(0)) {
        throw new Error('Domain log(x) harus lebih besar dari 0.');
      }
      return arg.log(10);
    }
    case 'exp':
      return arg.exp();
    case 'sqrt': {
      if (arg.lessThan(0)) {
        throw new Error('Akar kuadrat (√) bilangan negatif tidak real.');
      }
      return arg.sqrt();
    }
    case 'cbrt':
      return arg.cbrt();
    case 'abs':
      return arg.abs();
    case 'rad':
      return arg.times(DECIMAL_PI).dividedBy(180);
    case 'deg':
      return arg.times(180).dividedBy(DECIMAL_PI);
    default:
      throw new Error(`Fungsi tidak dikenali: "${fn}"`);
  }
}

/**
 * Recursive descent parser evaluating scientific tokens using Decimal.js
 * Grammar:
 *   Expr    -> Term (( '+' | '-' ) Term)*
 *   Term    -> Unary (( '*' | '/' | 'mod' ) Unary)*
 *   Unary   -> ('+' | '-') Unary | Power
 *   Power   -> Postfix ( '^' Unary )?
 *   Postfix -> FuncOrPrimary ( '!' | '%' | '²' | '³' )*
 *   FuncOrPrimary -> FUNC ( '(' Expr ')' | Unary ) | Primary
 *   Primary -> NUMBER | CONST | ANS | '(' Expr ')'
 */
function parseTokensToDecimal(
  tokens: Token[],
  angleUnit: CalculatorAngleUnit = 'DEG',
  ansValue: Decimal = new Decimal(0)
): Decimal {
  let pos = 0;

  function parseExpr(): Decimal {
    let left = parseTerm();
    while (
      pos < tokens.length &&
      tokens[pos].type === 'OP' &&
      (tokens[pos].value === '+' || tokens[pos].value === '-')
    ) {
      const op = tokens[pos].value;
      pos++;
      const right = parseTerm();
      left = op === '+' ? left.plus(right) : left.minus(right);
    }
    return left;
  }

  function parseTerm(): Decimal {
    let left = parseUnary();
    while (
      pos < tokens.length &&
      tokens[pos].type === 'OP' &&
      (tokens[pos].value === '*' ||
        tokens[pos].value === '/' ||
        tokens[pos].value === 'mod')
    ) {
      const op = tokens[pos].value;
      pos++;
      const right = parseUnary();
      if (op === '/') {
        if (right.isZero()) {
          throw new Error('Tidak dapat membagi dengan nol (Division by Zero).');
        }
        left = left.dividedBy(right);
      } else if (op === 'mod') {
        if (right.isZero()) {
          throw new Error('Tidak dapat modulo dengan nol (Modulo by Zero).');
        }
        left = left.modulo(right);
      } else {
        left = left.times(right);
      }
    }
    return left;
  }

  function parseUnary(): Decimal {
    if (
      pos < tokens.length &&
      tokens[pos].type === 'OP' &&
      (tokens[pos].value === '+' || tokens[pos].value === '-')
    ) {
      const op = tokens[pos].value;
      pos++;
      const operand = parseUnary();
      return op === '-' ? operand.negated() : operand;
    }
    return parsePower();
  }

  function parsePower(): Decimal {
    let base = parsePostfix();
    if (
      pos < tokens.length &&
      tokens[pos].type === 'OP' &&
      tokens[pos].value === '^'
    ) {
      pos++;
      const exponent = parseUnary();
      if (base.isZero() && exponent.isNegative()) {
        throw new Error('Tidak dapat membagi dengan nol (0 pangkat negatif).');
      }
      if (base.isNegative() && !exponent.isInteger()) {
        throw new Error('Pangkat pecahan dari bilangan negatif tidak real.');
      }
      base = base.pow(exponent);
    }
    return base;
  }

  function parsePostfix(): Decimal {
    let val = parseFuncOrPrimary();
    while (pos < tokens.length && tokens[pos].type === 'POSTFIX') {
      const op = tokens[pos].value;
      pos++;
      if (op === '!') {
        val = computeFactorial(val);
      } else if (op === '%') {
        val = val.dividedBy(100);
      } else if (op === '²') {
        val = val.pow(2);
      } else if (op === '³') {
        val = val.pow(3);
      }
    }
    return val;
  }

  function parseFuncOrPrimary(): Decimal {
    if (pos < tokens.length && tokens[pos].type === 'FUNC') {
      const fnName = tokens[pos].value;
      pos++;
      let arg: Decimal;
      if (pos < tokens.length && tokens[pos].type === 'LPAREN') {
        pos++;
        arg = parseExpr();
        if (pos >= tokens.length || tokens[pos].type !== 'RPAREN') {
          throw new Error(`Kurung tutup ")" untuk ${fnName}(...) tidak ditemukan.`);
        }
        pos++;
      } else {
        arg = parseUnary();
      }
      return applyScientificFunction(fnName, arg, angleUnit);
    }
    return parsePrimary();
  }

  function parsePrimary(): Decimal {
    if (pos >= tokens.length) {
      throw new Error('Ekspresi tidak lengkap.');
    }

    const tok = tokens[pos];
    if (tok.type === 'NUMBER') {
      pos++;
      return new Decimal(tok.value);
    }

    if (tok.type === 'CONST') {
      pos++;
      return tok.value === 'e' ? DECIMAL_E : DECIMAL_PI;
    }

    if (tok.type === 'ANS') {
      pos++;
      return ansValue;
    }

    if (tok.type === 'LPAREN') {
      pos++;
      const val = parseExpr();
      if (pos >= tokens.length || tokens[pos].type !== 'RPAREN') {
        throw new Error('Kurung tutup ")" tidak ditemukan.');
      }
      pos++;
      return val;
    }

    throw new Error(`Token tidak terduga: "${tok.value}"`);
  }

  const result = parseExpr();
  if (pos < tokens.length) {
    throw new Error(`Token berlebih pada akhir ekspresi: "${tokens[pos].value}"`);
  }
  return result;
}

export interface ArithmeticEvaluation {
  isValid: boolean;
  formattedResult: string;
  scientificNotation?: string;
  numericValue: number;
  error?: string;
}

export interface ArithmeticEvalOptions {
  angleUnit?: CalculatorAngleUnit;
  ans?: number | string;
}

/**
 * Evaluates a scientific or basic arithmetic expression using Decimal.js to avoid IEEE 754 drift.
 * Example:
 * - evaluateArithmetic("0.1 + 0.2") -> { isValid: true, formattedResult: "0.3", numericValue: 0.3 }
 * - evaluateArithmetic("sin(30)", "DEG") -> { isValid: true, formattedResult: "0.5", numericValue: 0.5 }
 */
export function evaluateArithmetic(
  expression: string,
  options?: CalculatorAngleUnit | ArithmeticEvalOptions
): ArithmeticEvaluation {
  try {
    const angleUnit: CalculatorAngleUnit =
      typeof options === 'string'
        ? options
        : options?.angleUnit ?? 'DEG';
    const rawAns =
      typeof options === 'object' && options?.ans !== undefined
        ? options.ans
        : 0;
    const ansDecimal =
      Number.isFinite(Number(rawAns)) ? new Decimal(rawAns) : new Decimal(0);

    const tokens = tokenizeExpression(expression);
    const decResult = parseTokensToDecimal(tokens, angleUnit, ansDecimal);
    // Round to 12 decimal places to clean any irrational tail while preserving exact decimals like 0.3
    const rounded = decResult.toDecimalPlaces(12, Decimal.ROUND_HALF_UP);
    const sciStr = decResult.isZero()
      ? '0'
      : decResult.toExponential(4).replace('e+', ' × 10^').replace('e', ' × 10^');

    return {
      isValid: true,
      formattedResult: rounded.toString(),
      scientificNotation: sciStr,
      numericValue: rounded.toNumber(),
    };
  } catch (err) {
    return {
      isValid: false,
      formattedResult: 'Error',
      numericValue: NaN,
      error: err instanceof Error ? err.message : 'Ekspresi tidak valid',
    };
  }
}

/**
 * Parses symbolic π strings (e.g., "3π/4", "pi/6", "-pi/3", "2*pi", "100π", "0.541")
 * into an exact JavaScript number.
 */
export function parseSymbolicPi(input: string | number): number {
  if (typeof input === 'number') {
    return input;
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return NaN;
  }
  const evaluated = evaluateArithmetic(trimmed, 'RAD');
  if (!evaluated.isValid) {
    return NaN;
  }
  return evaluated.numericValue;
}

// ============================================================================
// 2. HUB-AND-SPOKE ANGLE CONVERSION ENGINE (Tab 2: Konversi Sudut)
// ============================================================================

/**
 * Formats Decimal Degrees into Radian π notation:
 * - If deg / 180 simplifies to an exact rational fraction with denominator <= 360,
 *   formats as exact fraction (e.g., "3π/4 rad", "π/6 rad", "-π/6 rad", "π rad", "2π rad").
 * - Otherwise formats to 4 decimal places followed by "π rad" (e.g., "0.2786π rad").
 */
export function formatRadPi(deg: number): string {
  if (!Number.isFinite(deg)) {
    return '0π rad';
  }

  const ratio = deg / 180;
  if (Math.abs(ratio) < 1e-12) {
    return '0π rad';
  }

  // Search for exact rational fraction n / d with denominator d <= 360
  for (let d = 1; d <= 360; d++) {
    const scaled = ratio * d;
    const roundedN = Math.round(scaled);
    if (Math.abs(scaled - roundedN) < 1e-7 && roundedN !== 0) {
      const common = gcd(Math.abs(roundedN), d);
      const n = roundedN / common;
      const denom = d / common;
      const signStr = n < 0 ? '-' : '';
      const absN = Math.abs(n);

      if (denom === 1) {
        return absN === 1 ? `${signStr}π rad` : `${signStr}${absN}π rad`;
      }
      return absN === 1
        ? `${signStr}π/${denom} rad`
        : `${signStr}${absN}π/${denom} rad`;
    }
  }

  return `${ratio.toFixed(4)}π rad`;
}

/**
 * Extracts DMS (Degrees, Minutes, Seconds) from Decimal Degrees with negative angle
 * preservation and 60-second / 60-minute rollover guards.
 */
export function extractDMS(deg: number): DMSComponents {
  if (!Number.isFinite(deg)) {
    return {
      sign: 1,
      degrees: 0,
      minutes: 0,
      seconds: 0,
      formatted: `0° 0' 0.00"`,
    };
  }

  const sign: 1 | -1 = deg < 0 ? -1 : 1;
  const absDeg = Math.abs(deg);

  let D = Math.floor(absDeg);
  const remMin = (absDeg - D) * 60;
  let M = Math.floor(remMin);
  let S = Number(((remMin - M) * 60).toFixed(2));

  // Rollover guard: if S >= 60, set S = 0 and increment M by 1;
  // if M >= 60, set M = 0 and increment D by 1.
  if (S >= 60) {
    S = 0;
    M += 1;
  }
  if (M >= 60) {
    M = 0;
    D += 1;
  }

  const isNonZero = D > 0 || M > 0 || S > 0;
  const signPrefix = sign < 0 && isNonZero ? '-' : '';
  const formatted = `${signPrefix}${D}° ${M}' ${S.toFixed(2)}"`;

  return {
    sign,
    degrees: D,
    minutes: M,
    seconds: S,
    formatted,
  };
}

/**
 * Hub function: converts normalized Decimal Degrees into all target formats.
 */
export function convertFromDegrees(degInput: number | string): AngleConversionResult {
  const rawDeg =
    typeof degInput === 'number'
      ? degInput
      : Number(degInput.trim().replace(/,/g, '.').replace(/°/g, ''));

  if (!Number.isFinite(rawDeg)) {
    throw new Error('Input derajat desimal tidak valid.');
  }

  // Snap near-integers within 1e-11 to avoid floating point artifacts from π conversions
  const degValue =
    Math.abs(rawDeg - Math.round(rawDeg)) < 1e-11 ? Math.round(rawDeg) : rawDeg;

  const radDecValue = degValue * (Math.PI / 180);
  const degFormatted = `${degValue.toFixed(4)}°`;
  const radDecFormatted = `${radDecValue.toFixed(4)} rad`;
  const radPiFormatted = formatRadPi(degValue);
  const dms = extractDMS(degValue);

  return {
    degValue,
    degFormatted,
    radDecValue,
    radDecFormatted,
    radPiFormatted,
    dms,
  };
}

/**
 * Spoke B: Converts Radian input (symbolic π string like "3π/4", "pi/6", or numeric "0.8752")
 * to normalized Decimal Degrees and derives all target formats.
 */
export function convertFromRadians(radInput: string | number): AngleConversionResult {
  const radVal = parseSymbolicPi(radInput);
  if (!Number.isFinite(radVal)) {
    throw new Error('Input radian tidak valid.');
  }

  const deg = radVal * (180 / Math.PI);
  return convertFromDegrees(deg);
}

/**
 * Spoke C: Converts DMS (Degrees, Minutes, Seconds) components to normalized Decimal Degrees
 * and derives all target formats. Validates M in [0, 59] and S in [0, 60).
 */
export function convertFromDMS(
  degrees: number,
  minutes: number,
  seconds: number,
  isNegative = false
): AngleConversionResult {
  if (!Number.isFinite(degrees) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
    throw new Error('Komponen D, M, S harus berupa angka valid.');
  }

  if (minutes < 0 || minutes > 59 || !Number.isInteger(minutes)) {
    throw new Error('Menit (M) harus berupa bilangan bulat dalam rentang [0, 59].');
  }

  if (seconds < 0 || seconds >= 60) {
    throw new Error('Detik (S) harus berada dalam rentang [0, 60).');
  }

  const sign = isNegative || degrees < 0 ? -1 : 1;
  const absD = Math.abs(degrees);
  const decDeg = sign * (absD + minutes / 60 + seconds / 3600);

  return convertFromDegrees(decDeg);
}

// ============================================================================
// 3. SINUSOIDAL WAVEFORM SIMULATOR & ANALYTICAL SOLVER (Tab 3)
// ============================================================================

/**
 * Evaluates the sinusoidal waveform at time tSec (in seconds)
 */
export function evaluateWaveAt(
  amplitude: number,
  omegaRad: number,
  phiRadSigned: number,
  waveType: WaveFunctionType,
  tSec: number
): number {
  const arg = omegaRad * tSec + phiRadSigned;
  return waveType === 'cos' ? amplitude * Math.cos(arg) : amplitude * Math.sin(arg);
}

/**
 * Solves all analytical parameters (a) through (e) for the AC Sinusoidal Waveform Simulator
 */
export function solveSinusoidal(params: SinusoidalInputParams): SinusoidalAnalyticalResult {
  const { amplitude, omegaInput, waveType, phaseSign, phiInput, vTarget } = params;

  const omegaRad = parseSymbolicPi(omegaInput);
  const parsedPhi = phaseSign === '0' ? 0 : parseSymbolicPi(phiInput);

  if (!Number.isFinite(amplitude) || amplitude <= 0) {
    return createInvalidResult(params, 'Amplitudo (A) harus lebih besar dari 0 V.');
  }

  if (!Number.isFinite(omegaRad) || omegaRad <= 0) {
    return createInvalidResult(params, 'Kecepatan sudut (ω) harus lebih besar dari 0 rad/s.');
  }

  if (!Number.isFinite(parsedPhi)) {
    return createInvalidResult(params, 'Sudut beda fase (φ) tidak valid.');
  }

  const phiRadUnsigned = phaseSign === '0' ? 0 : Math.abs(parsedPhi);
  const phiRadSigned =
    phaseSign === '0'
      ? 0
      : phaseSign === '+'
      ? phiRadUnsigned
      : -phiRadUnsigned;

  // (a) Parameter Dasar
  const periodS = (2 * Math.PI) / omegaRad;
  const periodMs = periodS * 1000;
  const frequencyHz = 1 / periodS;
  const phiDegUnsigned = phiRadUnsigned * (180 / Math.PI);
  const phiDegSigned = phiRadSigned * (180 / Math.PI);
  const phiDegFormatted = `${phiDegUnsigned.toFixed(2)}°`;

  // (b) v saat t = 0
  const vAtZero = evaluateWaveAt(amplitude, omegaRad, phiRadSigned, waveType, 0);

  // (c) v saat t = 10 ms (0.01 s)
  const vAt10ms = evaluateWaveAt(amplitude, omegaRad, phiRadSigned, waveType, 0.01);

  // (d) t saat v = V_target pertama (t >= 0)
  const targetExceedsAmplitude = Math.abs(vTarget) > amplitude;
  let theta1Rad: number | null = null;
  let theta2Rad: number | null = null;
  let tAtTargetMs: number | null = null;
  let tAtTargetFormatted = 'Melebihi Amplitudo (|V_target| > A)';

  if (!targetExceedsAmplitude && Number.isFinite(vTarget)) {
    const ratio = Math.max(-1, Math.min(1, vTarget / amplitude));
    if (waveType === 'sin') {
      const asinVal = Math.asin(ratio);
      theta1Rad = positiveModulo2Pi(asinVal - phiRadSigned);
      theta2Rad = positiveModulo2Pi(Math.PI - asinVal - phiRadSigned);
    } else {
      const acosVal = Math.acos(ratio);
      theta1Rad = positiveModulo2Pi(acosVal - phiRadSigned);
      theta2Rad = positiveModulo2Pi(-acosVal - phiRadSigned);
    }
    const minTheta = Math.min(theta1Rad, theta2Rad);
    tAtTargetMs = (minTheta / omegaRad) * 1000;
    tAtTargetFormatted = `${tAtTargetMs.toFixed(2)} ms`;
  }

  // (e) t saat v Maksimum pertama (t >= 0)
  const peakAngle = waveType === 'sin' ? Math.PI / 2 : 0;
  const thetaMax = positiveModulo2Pi(peakAngle - phiRadSigned);
  const tAtMaxMs = (thetaMax / omegaRad) * 1000;
  const tAtMaxFormatted = `${tAtMaxMs.toFixed(2)} ms`;

  // Formatted equation & phase status banner
  const fnName = waveType === 'cos' ? 'cos' : 'sin';
  const cleanOmega = omegaInput.trim().replace(/\s+/g, '');
  const cleanPhi = phiInput.trim().replace(/^[+-]/, '').trim();

  let equation = `v(t) = ${amplitude} ${fnName}(${cleanOmega}t) V`;
  let phaseStatusLabel: 'LEADING (MENDAHULUI)' | 'IN PHASE (SEFASE)' | 'LAGGING (TERTINGGAL)' =
    'IN PHASE (SEFASE)';
  let phaseStatusBanner = 'IN PHASE (SEFASE) — Beda Fase 0.00°';

  if (phaseSign === '+' && phiRadUnsigned > 1e-12) {
    equation = `v(t) = ${amplitude} ${fnName}(${cleanOmega}t + ${cleanPhi}) V`;
    phaseStatusLabel = 'LEADING (MENDAHULUI)';
    phaseStatusBanner = `LEADING (MENDAHULUI) +${phiDegUnsigned.toFixed(2)}°`;
  } else if (phaseSign === '-' && phiRadUnsigned > 1e-12) {
    equation = `v(t) = ${amplitude} ${fnName}(${cleanOmega}t - ${cleanPhi}) V`;
    phaseStatusLabel = 'LAGGING (TERTINGGAL)';
    phaseStatusBanner = `LAGGING (TERTINGGAL) -${phiDegUnsigned.toFixed(2)}°`;
  }

  return {
    isValid: true,
    amplitude,
    omegaInput,
    omegaRad,
    waveType,
    phaseSign,
    phiInput,
    phiRadUnsigned,
    phiRadSigned,
    phiDegUnsigned,
    phiDegSigned,
    phiDegFormatted,
    vTarget,
    periodS,
    periodMs,
    frequencyHz,
    vAtZero,
    vAt10ms,
    targetExceedsAmplitude,
    tAtTargetMs,
    tAtTargetFormatted,
    theta1Rad,
    theta2Rad,
    tAtMaxMs,
    tAtMaxFormatted,
    equation,
    phaseStatusLabel,
    phaseStatusBanner,
  };
}

function createInvalidResult(
  params: SinusoidalInputParams,
  errorMessage: string
): SinusoidalAnalyticalResult {
  return {
    isValid: false,
    errorMessage,
    amplitude: params.amplitude || 0,
    omegaInput: params.omegaInput,
    omegaRad: 0,
    waveType: params.waveType,
    phaseSign: params.phaseSign,
    phiInput: params.phiInput,
    phiRadUnsigned: 0,
    phiRadSigned: 0,
    phiDegUnsigned: 0,
    phiDegSigned: 0,
    phiDegFormatted: '0.00°',
    vTarget: params.vTarget || 0,
    periodS: 0,
    periodMs: 0,
    frequencyHz: 0,
    vAtZero: 0,
    vAt10ms: 0,
    targetExceedsAmplitude: true,
    tAtTargetMs: null,
    tAtTargetFormatted: '-',
    theta1Rad: null,
    theta2Rad: null,
    tAtMaxMs: 0,
    tAtMaxFormatted: '-',
    equation: '-',
    phaseStatusLabel: 'IN PHASE (SEFASE)',
    phaseStatusBanner: 'IN PHASE (SEFASE) — 0.00°',
  };
}

/**
 * Generates sample points across 1.25 cycles (t in [0, 1.25 * T]) for plotting
 * both the reference wave v_ref(t) = A sin(ωt) and phase-shifted wave v(t) = A sin(ωt ± φ).
 */
export function generateWaveformPoints(
  result: SinusoidalAnalyticalResult,
  numSteps = 250
): WaveformPlotPoint[] {
  if (!result.isValid || result.periodS <= 0) {
    return [];
  }

  const maxTimeSec = 1.25 * result.periodS;
  const points: WaveformPlotPoint[] = [];

  for (let i = 0; i <= numSteps; i++) {
    const tSec = (i / numSteps) * maxTimeSec;
    const tMs = tSec * 1000;
    const vRef = evaluateWaveAt(
      result.amplitude,
      result.omegaRad,
      0,
      result.waveType,
      tSec
    );
    const vShifted = evaluateWaveAt(
      result.amplitude,
      result.omegaRad,
      result.phiRadSigned,
      result.waveType,
      tSec
    );
    points.push({ tMs, tSec, vRef, vShifted });
  }

  return points;
}
