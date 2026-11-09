import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeatureController, SoftAction } from '../../core/feature-contract';
import { KeypadKey } from '../../core/os-models';
import { calculate } from './calculator-engine';

@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'os-calculator',
  standalone: true,
  imports: [CommonModule],
  template: ` <div class="stack calculator">
    <p class="hint">Arithmetic with precedence · % means ÷100</p>
    <div class="calculation" aria-live="polite">
      <small>{{ expression || '0' }}</small
      ><output>{{ error || result }}</output>
    </div>
    <div class="calc-grid">
      @for (button of buttons; track button) {
        <button
          type="button"
          [class.operator]="isOperator(button)"
          [attr.aria-label]="label(button)"
          (click)="press(button)"
        >
          {{ button }}
        </button>
      }
    </div>
    <p class="hint">Keypad: * cycles + − × ÷ · # or OK calculates.</p>
  </div>`,
  styles: [
    `
      .calculation {
        padding: 18px 12px;
        border: 1px solid var(--line);
        border-radius: 12px;
        text-align: right;
        overflow-wrap: anywhere;
      }
      .calculation small {
        display: block;
        min-height: 20px;
        opacity: 0.65;
      }
      .calculation output {
        font-size: 25px;
        line-height: 1.6;
      }
      .calc-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 7px;
      }
      .calc-grid button {
        min-height: 45px;
        font-size: 18px;
      }
      .operator {
        color: var(--accent);
        font-weight: 700;
      }
    `,
  ],
})
export class CalculatorComponent implements FeatureController {
  expression = '';
  result = '0';
  error = '';
  private evaluated = false;
  readonly buttons = [
    'C',
    '⌫',
    '%',
    '÷',
    '7',
    '8',
    '9',
    '×',
    '4',
    '5',
    '6',
    '−',
    '1',
    '2',
    '3',
    '+',
    '±',
    '0',
    '.',
    '=',
  ];
  get left(): SoftAction {
    return { label: 'Clear', run: () => this.press('C') };
  }
  get center(): SoftAction {
    return { label: '=', run: () => this.press('=') };
  }
  label(value: string): string {
    return (
      (
        {
          C: 'Clear',
          '⌫': 'Backspace',
          '±': 'Change sign',
          '=': 'Equals',
          '÷': 'Divide',
          '×': 'Multiply',
        } as Record<string, string>
      )[value] || value
    );
  }
  isOperator(value: string): boolean {
    return ['÷', '×', '−', '+', '='].includes(value);
  }
  press(value: string): void {
    this.error = '';
    if (value === 'C') {
      this.expression = '';
      this.result = '0';
      this.evaluated = false;
      return;
    }
    if (value === '⌫') {
      this.expression = this.expression.slice(0, -1);
      this.evaluated = false;
      return;
    }
    if (value === '=') {
      try {
        this.result = String(calculate(this.expression));
        this.evaluated = true;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Invalid calculation.';
      }
      return;
    }
    if (this.evaluated) {
      this.expression = this.isOperator(value) || value === '%' ? this.result : '';
      this.evaluated = false;
    }
    if (value === '±') {
      if (!this.expression) {
        this.expression = '-';
        return;
      }
      const match = this.expression.match(/(\d*\.?\d+%?)$/);
      if (match) {
        const start = this.expression.length - match[0].length;
        const before = this.expression.slice(0, start);
        if (before.endsWith('−') || before.endsWith('-')) {
          const prefix = before.slice(0, -1);
          this.expression = prefix + (prefix && !/[+×÷]$/.test(prefix) ? '+' : '') + match[0];
        } else
          this.expression = (before.endsWith('+') ? before.slice(0, -1) : before) + '−' + match[0];
      }
      return;
    }
    if (this.expression.length < 150) this.expression += value;
  }
  key(key: KeypadKey): boolean {
    if (/^\d$/.test(key)) {
      this.press(key);
      return true;
    }
    if (key === 'back') {
      this.press('⌫');
      return true;
    }
    if (key === 'hash') {
      this.press('=');
      return true;
    }
    if (key === 'star') {
      const operators = ['+', '−', '×', '÷'];
      const last = this.expression.at(-1) || '';
      const next = operators[(operators.indexOf(last) + 1) % operators.length];
      if (operators.includes(last)) this.expression = this.expression.slice(0, -1);
      this.press(next);
      return true;
    }
    return false;
  }
}
