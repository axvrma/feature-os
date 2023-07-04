export const APP_ROUTES = [
  {
    systemApp: true,
    path: 'launcher',
    loadChildren: () => import('./launcher').then(_ => _.LauncherModule)
  },
  {
    systemApp: false,
    path: 'alarms',
    loadChildren: () => import('./alarms').then(_ => _.AlarmsModule)
  },
  // {
  //   systemApp: false,
  //   path: 'calculator',
  //   loadChildren: () => import('./calculator').then(_ => _.CalculatorModule)
  // },
  // {
  //   systemApp: false,
  //   path: 'calendar',
  //   loadChildren: () => import('./calendar').then(_ => _.CalendarModule)
  // },
  // {
  //   systemApp: false,
  //   path: 'messages',
  //   loadChildren: () => import('./messages').then(_ => _.MessagesModule)
  // },
  // {
  //   systemApp: false,
  //   path: 'phone',
  //   loadChildren: () => import('./phone').then(_ => _.PhoneModule)
  // },
  {
    systemApp: false,
    path: 'settings',
    loadChildren: () => import('./settings').then(_ => _.SettingsModule)
  }
]
