import { Injectable, signal } from '@angular/core';
import { OsAppId } from './os-models';
export type Screen = 'home' | OsAppId;
export interface LaunchContext {
  phone?: string;
  name?: string;
}
@Injectable({ providedIn: 'root' })
export class OsNavigationService {
  readonly screen = signal<Screen>('home');
  readonly context = signal<LaunchContext>({});
  readonly launcherIndex = signal(0);
  readonly lastApp = signal<OsAppId | null>(null);
  private stack: Array<{ screen: Screen; context: LaunchContext }> = [];
  open(app: OsAppId, context: LaunchContext = {}): void {
    if (this.screen() !== app) this.stack.push({ screen: this.screen(), context: this.context() });
    this.lastApp.set(app);
    this.context.set(context);
    this.screen.set(app);
  }
  back(): void {
    const prev = this.stack.pop();
    this.screen.set(prev?.screen ?? 'home');
    this.context.set(prev?.context ?? {});
  }
  home(): void {
    this.stack = [];
    this.context.set({});
    this.screen.set('home');
  }
}
export function moveGrid(
  index: number,
  direction: 'up' | 'down' | 'left' | 'right',
  length: number,
  columns = 3,
): number {
  if (length === 0) return 0;
  if (direction === 'left') return (index + length - 1) % length;
  if (direction === 'right') return (index + 1) % length;
  const column = index % columns;
  const cells = Array.from({ length }, (_, i) => i).filter((i) => i % columns === column);
  const row = cells.indexOf(index);
  return cells[(row + (direction === 'up' ? -1 : 1) + cells.length) % cells.length];
}
