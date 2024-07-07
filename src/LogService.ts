import * as vscode from 'vscode';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'NONE';

export const dotenvxOutputChannel = vscode.window.createOutputChannel('Dotenvx', 'dotenv');

export class LogService {
  private outputChannel = dotenvxOutputChannel;

  private logLevel: LogLevel = 'INFO';

  public setOutputLevel(logLevel: LogLevel) {
    this.logLevel = logLevel;
  }

  public debug(message: string, data?: unknown): void {
    if (
      this.logLevel === 'NONE' ||
      this.logLevel === 'INFO' ||
      this.logLevel === 'WARN' ||
      this.logLevel === 'ERROR'
    ) {
      return;
    }
    this.message(message, 'DEBUG');
    if (data) {
      this.object(data);
    }
  }

  public info(message: string, data?: unknown): void {
    if (this.logLevel === 'NONE' || this.logLevel === 'WARN' || this.logLevel === 'ERROR') {
      return;
    }
    this.message(message, 'INFO');
    if (data) {
      this.object(data);
    }
  }

  public warn(message: string, data?: unknown): void {
    if (this.logLevel === 'NONE' || this.logLevel === 'ERROR') {
      return;
    }
    this.message(message, 'WARN');
    if (data) {
      this.object(data);
    }
  }

  public error(message: string, error?: unknown) {
    if (this.logLevel === 'NONE') {
      return;
    }
    this.message(message, 'ERROR');
    if (typeof error === 'string') {
      this.outputChannel.appendLine(error);
    } else if (error instanceof Error) {
      if (error?.message) {
        this.message(error.message, 'ERROR');
      }
      if (error?.stack) {
        this.outputChannel.appendLine(error.stack);
      }
    } else if (error) {
      this.object(error);
    }
  }

  public show() {
    this.outputChannel.show();
  }

  private object(data: unknown): void {
    const message = JSON.stringify(data, null, 2);

    this.outputChannel.appendLine(message);
  }

  private message(message: string, logLevel: LogLevel): void {
    const title = new Date().toLocaleTimeString();
    this.outputChannel.appendLine(`["${logLevel}" - ${title}] ${message}`);
  }
}
