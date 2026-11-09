import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OsStateService } from '../../core/os-state.service';
import { FeatureController, SoftAction } from '../../core/feature-contract';
import { KeypadKey } from '../../core/os-models';
import { Direction, SnakeEngine } from './snake-engine';
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'os-snake',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `<div class="stack snake-app">
    <div class="actions">
      <strong>Score {{ game.score }}</strong
      ><span>Best {{ os.data()!.highScore }}</span>
    </div>
    <canvas
      #board
      width="288"
      height="288"
      role="img"
      [attr.aria-label]="'Snake board. Score ' + game.score + '. Use D-pad to steer.'"
    ></canvas>
    <p aria-live="polite" class="game-status">
      {{
        game.over
          ? game.won
            ? 'You filled the board!'
            : 'Game over · Try again'
          : running
            ? 'D-pad to steer'
            : started
              ? 'Paused'
              : 'Ready when you are'
      }}
    </p>
    <div class="actions">
      <button type="button" (click)="toggle()">
        {{ game.over ? 'Play again' : running ? 'Pause' : started ? 'Resume' : 'Start' }}</button
      ><button type="button" (click)="restart()">Restart</button>
    </div>
    <label class="field"
      >Difficulty<select [ngModel]="speed" (ngModelChange)="changeSpeed($event)">
        <option [ngValue]="210">Easy</option>
        <option [ngValue]="145">Normal</option>
        <option [ngValue]="90">Fast</option>
      </select></label
    >
    <p class="hint">Avoid walls and your tail. Leaving ends this game; your best score is saved.</p>
  </div>`,
  styles: [
    `
      .snake-app canvas {
        display: block;
        width: 100%;
        max-width: 288px;
        aspect-ratio: 1;
        border-radius: 10px;
        border: 2px solid #668561;
        background: #17271e;
        image-rendering: pixelated;
        align-self: center;
      }
      .game-status {
        text-align: center;
        font-weight: 650;
        margin: 0;
        min-height: 22px;
      }
    `,
  ],
})
export class SnakeComponent implements FeatureController, AfterViewInit, OnDestroy {
  readonly os = inject(OsStateService);
  @ViewChild('board') board?: ElementRef<HTMLCanvasElement>;
  game = new SnakeEngine();
  speed = 145;
  running = false;
  started = false;
  private timer?: number;
  get center(): SoftAction {
    return {
      label: this.running ? 'Pause' : this.game.over ? 'Again' : this.started ? 'Resume' : 'Start',
      run: () => this.toggle(),
    };
  }
  get left(): SoftAction {
    return { label: 'Restart', run: () => this.restart() };
  }
  ngAfterViewInit(): void {
    this.paint();
  }
  ngOnDestroy(): void {
    this.stop();
    this.saveBest();
  }
  @HostListener('document:visibilitychange') visibility(): void {
    if (document.hidden) this.stop();
  }
  key(key: KeypadKey): boolean {
    const directions: Partial<Record<KeypadKey, Direction>> = {
      up: 'up',
      down: 'down',
      left: 'left',
      right: 'right',
      '2': 'up',
      '8': 'down',
      '4': 'left',
      '6': 'right',
    };
    const direction = directions[key];
    if (direction) {
      this.game.turn(direction);
      return true;
    }
    return false;
  }
  toggle(): void {
    if (this.running) {
      this.stop();
      return;
    }
    if (this.game.over) this.game = new SnakeEngine();
    this.started = true;
    this.running = true;
    this.timer = window.setInterval(() => {
      this.game.step();
      this.paint();
      if (this.game.over) {
        this.stop();
        this.saveBest();
        this.os.feedback(
          this.game.won ? 'Board complete!' : `Game over. Score ${this.game.score}.`,
        );
      }
    }, this.speed);
    this.paint();
  }
  restart(): void {
    this.stop();
    this.saveBest();
    this.game = new SnakeEngine();
    this.started = false;
    this.paint();
  }
  changeSpeed(value: number): void {
    const playing = this.running;
    this.stop();
    this.speed = value;
    if (playing) this.toggle();
  }
  private stop(): void {
    window.clearInterval(this.timer);
    this.running = false;
  }
  private saveBest(): void {
    if (this.game.score > this.os.data()!.highScore)
      this.os.update((data) => {
        data.highScore = this.game.score;
      });
  }
  private paint(): void {
    const canvas = this.board?.nativeElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const cell = canvas.width / this.game.size;
    ctx.fillStyle = '#17271e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#344c38';
    for (let x = 0; x < this.game.size; x++)
      for (let y = 0; y < this.game.size; y++)
        ctx.fillRect(x * cell + cell / 2, y * cell + cell / 2, 1, 1);
    this.game.body.forEach((part, index) => {
      ctx.fillStyle = index === 0 ? '#ecedaa' : '#a9ca7c';
      ctx.fillRect(part.x * cell + 1, part.y * cell + 1, cell - 2, cell - 2);
    });
    if (!this.game.won) {
      ctx.fillStyle = '#ec9c68';
      ctx.fillRect(this.game.food.x * cell + 3, this.game.food.y * cell + 3, cell - 6, cell - 6);
    }
  }
}
