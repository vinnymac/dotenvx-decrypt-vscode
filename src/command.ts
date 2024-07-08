import * as vscode from 'vscode';
import * as util from 'node:util';
import * as cp from 'node:child_process';

import { findDotenvxBinaryPath } from './findDotenvxBinaryPath.js';
import { LogService } from './LogService.js';

const execAsync = util.promisify(cp.exec);

class DotenvxCommand {
  private logger = new LogService();
  private dotenvxPath: string | null = null;
  private get binaryPath() {
    return (async () => {
      if (this.dotenvxPath) {
        return this.dotenvxPath;
      }
      this.dotenvxPath = await findDotenvxBinaryPath();
      if (!this.dotenvxPath) {
        vscode.window.showErrorMessage(
          'dotenvx binary not found. Please install dotenvx globally or in your project, then try again.',
        );
        throw new Error('dotenvx binary not found');
      }
      return this.dotenvxPath;
    })();
  }

  /**
   * Execute a dotenvx command
   */
  private async dotenvxExec(command: string) {
    const { stdout, stderr } = await execAsync(`${await this.binaryPath} ${command}`);
    if (stderr) {
      throw new Error(stderr);
    }
    return stdout.toString().trim();
  }

  /**
   * Run: dotenvx get -f .env
   */
  public async getDecrypted(filePath: string) {
    const result = await this.dotenvxExec(`get -f ${filePath}`);
    if (!result) {
      return null;
    }
    return JSON.parse(result);
  }

  /**
   * Run: dotenvx version
   */
  public async checkVersion() {
    try {
      const version = await this.dotenvxExec('--version');
      if (version) {
        return version;
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error('Failed to call dotenvx version', error);
      }
    }
    return '';
  }

  /**
   * Check the version of dotenvx is 1.0.0 or higher
   */
  public async checkVersionSupported() {
    const version = await this.checkVersion();
    this.logger.debug(`Dotenvx Version: ${version}`);
    return Boolean(version) && parseInt(version.split('.')[0], 10) >= 1;
  }

  /**
   * Run: dotenvx convert
   */
  public async convert(filePath: string) {
    try {
      const result = await this.dotenvxExec(`convert -f ${filePath}`);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        vscode.window.showErrorMessage(error.message);
      }
      return null;
    }
  }

  /**
   * Run: dotenvx set [key] [secret] -f [filePath]
   */
  public async setSecretForKey(key: string, secret: string, filePath: string) {
    try {
      const result = await this.dotenvxExec(`set ${key} ${secret} -f ${filePath}`);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        vscode.window.showErrorMessage(error.message);
      }
      return null;
    }
  }

  /**
   * Run: dotenvx get [key] -f [filePath]
   */
  public async getSecretForKey(key: string, filePath: string) {
    try {
      const result = await this.dotenvxExec(`get ${key} -f ${filePath}`);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        vscode.window.showErrorMessage(error.message);
      }
      return null;
    }
  }

  public isSupportedFile(file: string) {
    return file.startsWith('.env') && file !== '.env.keys';
  }
}

export const dotenvxCommand = new DotenvxCommand();
