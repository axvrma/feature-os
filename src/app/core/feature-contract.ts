import { KeypadKey } from './os-models';
export interface SoftAction {
  label: string;
  run: () => void;
}
export interface FeatureController {
  prepareReload?(): boolean | Promise<boolean>;
  key?(key: KeypadKey): boolean;
  readonly left?: SoftAction;
  readonly center?: SoftAction;
  readonly right?: SoftAction;
}
