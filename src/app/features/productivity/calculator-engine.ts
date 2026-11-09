/** Safe arithmetic parser. Percent is a postfix /100 operator; multiplication precedes addition. */
export function calculate(expression: string): number {
  if (!expression.trim()) return 0;
  if (expression.length > 300) throw new Error('Expression is too long.');
  const source = expression
    .replace(/\s/g, '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-');
  let position = 0;
  const peek = () => source[position];
  const number = (): number => {
    if (peek() === '+') {
      position++;
      return number();
    }
    if (peek() === '-') {
      position++;
      return -number();
    }
    let value: number;
    if (peek() === '(') {
      position++;
      value = sum();
      if (peek() !== ')') throw new Error('Close the parenthesis.');
      position++;
    } else {
      const match = source.slice(position).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
      if (!match) throw new Error('Enter a complete calculation.');
      position += match[0].length;
      value = Number(match[0]);
    }
    while (peek() === '%') {
      value /= 100;
      position++;
    }
    return value;
  };
  const product = (): number => {
    let value = number();
    while (peek() === '*' || peek() === '/') {
      const operator = source[position++];
      const operand = number();
      if (operator === '/' && operand === 0) throw new Error('Cannot divide by zero.');
      value = operator === '*' ? value * operand : value / operand;
    }
    return value;
  };
  const sum = (): number => {
    let value = product();
    while (peek() === '+' || peek() === '-') {
      const operator = source[position++];
      const operand = product();
      value = operator === '+' ? value + operand : value - operand;
    }
    return value;
  };
  const result = sum();
  if (position !== source.length) throw new Error('Use numbers and arithmetic operators.');
  if (!Number.isFinite(result)) throw new Error('Result is too large.');
  return Number(result.toPrecision(12));
}
