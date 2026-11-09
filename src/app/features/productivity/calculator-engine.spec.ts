import { CalculatorComponent } from './calculator.component';
import { calculate } from './calculator-engine';
describe('calculator arithmetic', () => {
  it('respects precedence, unary signs, parentheses and postfix percentages', () => {
    expect(calculate('2+3*4')).toBe(14);
    expect(calculate('-(2+3)*4')).toBe(-20);
    expect(calculate('200*10%')).toBe(20);
    expect(calculate('5--2')).toBe(7);
  });
  it('normalizes decimal precision without silently accepting malformed input', () => {
    expect(calculate('0.1 + 0.2')).toBe(0.3);
    expect(calculate('.5×2')).toBe(1);
    expect(() => calculate('3/0')).toThrowError('Cannot divide by zero.');
    expect(() => calculate('1.2.3')).toThrow();
    expect(() => calculate('alert(1)')).toThrow();
    expect(() => calculate('2+')).toThrow();
  });
});

describe('calculator sign controls', () => {
  it('toggles the final operand without accumulating operators', () => {
    const calculator = new CalculatorComponent();
    for (const key of ['5', '+', '2', '±']) calculator.press(key);
    expect(calculator.expression).toBe('5−2');
    calculator.press('±');
    expect(calculator.expression).toBe('5+2');
    calculator.press('=');
    expect(calculator.result).toBe('7');
    calculator.press('C');
    for (const key of ['2', '×', '3', '±', '±']) calculator.press(key);
    expect(calculator.expression).toBe('2×3');
  });
});
