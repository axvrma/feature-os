export const APP_ROUTES = [
  {
    path: 'launcher',
    loadChildren: () => import('./launcher').then(_ => _.LauncherModule)
  },
  {
    path: 'alarms',
    loadChildren: () => import('./alarms').then(_ => _.AlarmsModule)
  },
  {
    path: 'calculator',
    loadChildren: () => import('./calculator').then(_ => _.CalculatorModule)
  },
  {
    path: 'calendar',
    loadChildren: () => import('./calendar').then(_ => _.CalendarModule)
  },
  {
    path: 'messages',
    loadChildren: () => import('./messages').then(_ => _.MessagesModule)
  },
  {
    path: 'phone',
    loadChildren: () => import('./phone').then(_ => _.PhoneModule)
  },
  {
    path: 'settings',
    loadChildren: () => import('./settings').then(_ => _.SettingsModule)
  }
]
