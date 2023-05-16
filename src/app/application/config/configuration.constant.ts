import { ConfigurationModel } from "./configuration.model";

export const CONFIGURATION: ConfigurationModel = {
  drawer: [
    {
      name: 'Phone',
      icon: 'call',
      active: false
    }, {
      name: 'Messages',
      icon: 'sms',
      active: false
    }, {
      name: 'Calendar',
      icon: 'today',
      active: false
    }, {
      name: 'Calculate',
      icon: 'calculate',
      active: false
    }, {
      name: 'Alarms',
      icon: 'alarm',
      active: true
    }, {
      name: 'Settings',
      icon: 'settings',
      active: false
    }
  ]
}
