import { Keypad } from "../enum";

export interface KeypadAction {
  [Keypad.ACTION_LEFT]?: () => void,
  [Keypad.ACTION_RIGHT]?: () => void,
  [Keypad.CALL]?: () => void,
  [Keypad.CALL_DISCONNECT]?: () => void,
  [Keypad.D_PAD_CENTER]?: () => void,
  [Keypad.D_PAD_DOWN]?: () => void,
  [Keypad.D_PAD_LEFT]?: () => void,
  [Keypad.D_PAD_RIGHT]?: () => void,
  [Keypad.D_PAD_UP]?: () => void,
}
