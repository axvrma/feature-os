import { ConfigurationModel } from "./configuration.model";

const baseRoute = '/base/app';

export const CONFIGURATION: ConfigurationModel = {
  drawer: [
    {
      name: 'Phone',
      icon: 'call',
      active: false,
      route: baseRoute + '/phone'
    }, {
      name: 'Messages',
      icon: 'sms',
      active: false,
      route: ''
    }, {
      name: 'Calendar',
      icon: 'today',
      active: false,
      route: ''
    }, {
      name: 'Calculate',
      icon: 'calculate',
      active: false,
      route: ''
    }, {
      name: 'Alarms',
      icon: 'alarm',
      active: true,
      route: ''
    }, {
      name: 'Settings',
      icon: 'settings',
      active: false,
      route: ''
    }
  ]
}
