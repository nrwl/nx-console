import * as ua from 'universal-analytics';
import  { ipcMain } from 'electron';

let visitor: any;

const options: ua.VisitorOptions = {
  https: true
};

visitor = new ua.Visitor('UA-88380372-8', options);
// Register for messages sent from the renderer
ipcMain.on(
  'reportEvent',
  (event: any, arg: any) => this.reportEvent(arg.category, arg.action, arg.label, arg.value, arg.cb));
ipcMain.on(
  'reportPageView',
  (event: any, arg: any) => this.reportPageView(arg.path));
ipcMain.on(
  'reportException',
  (event: any, arg: any) => this.reportException(arg.description));

export function errorHandler(error: Error | null, count: number) {
  if (error) {
    console.error('Analytics', error, count);
  }
}

export function reportDuration(category: string, variable: string, time: number) {
  visitor.timing(category, variable, time, this.errorHandler);
}
export function reportEvent(category: string, action: string, label: string, value?: number, cb?: any) {
  if (value) {
    visitor.event(category, action, label, value, this.errorHandler);
  } else {
    visitor.event(category, action, label, this.errorHandler);
  }
  return cb && cb();
}

export function reportException(description: string, fatal: boolean = false) {
  if (fatal) {
    console.error('Analytics', 'reportException', description);
  } else {
    console.warn('Analytics', 'reportException', description);
  }

  visitor.exception(description, fatal, this.errorHandler);
}

export function reportPageView(path: string = '') {
  visitor.screenview(path, 'Angular Console', '6.0.0-beta.1', this.errorHandler);
};


module.exports = { reportException, reportEvent, reportPageView };
