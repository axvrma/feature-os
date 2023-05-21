export interface ActionBarModel {
  left: IconAction,
  center: TextAction,
  right: IconAction,
}

interface IconAction {
  icon: string,
}

interface TextAction {
  text: string,
}
