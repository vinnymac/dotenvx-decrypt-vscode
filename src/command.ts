import * as vscode from 'vscode';
import * as util from 'node:util';
import * as cp from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// Binary works fine, but avoiding shell is faster
import dotenvx from '@dotenvx/dotenvx';

import { findDotenvxBinaryPath } from './findDotenvxBinaryPath.js';
import { LogService } from './LogService.js';
import { preferences } from './preferences.js';

const execAsync = util.promisify(cp.exec);

class DotenvxCommand {
  private logger = new LogService();
  private dotenvxPath: string | null = null;
  private get binaryPath() {
    return (async () => {
      // Doesn't get used atm since we avoid shell when this setting is disabled
      if (!preferences.autoSearchForLocalDotenvxBinaryEnabled) {
        return path.resolve(__dirname, './../node_modules/.bin/dotenvx');
      }
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
    if (!preferences.autoSearchForLocalDotenvxBinaryEnabled) {
      const result = dotenvx.get(undefined, [
        { type: 'envFile', value: filePath },
      ] as unknown as string[]);
      if (!result || typeof result === 'string') {
        return null;
      }
      return result;
    }

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
      this.logger.error('Failed to call dotenvx version', error);
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
   * Run: dotenvx encrypt
   */
  public async encrypt(filePath: string, key?: string) {
    if (!preferences.autoSearchForLocalDotenvxBinaryEnabled) {
      const result = dotenvx.encrypt(filePath, (key || undefined) as unknown as string);
      const envFile = result.processedEnvFiles[0];
      if (envFile.error) {
        this.logger.error(`Failed to encrypt file at ${filePath}`, envFile.error);
        return null;
      }
      await fs.writeFile(envFile.envFilepath, envFile.envSrc, 'utf8');
      return 'success';
    }

    try {
      const result = await this.dotenvxExec(`encrypt${key ? ` --key ${key}` : ''} -f ${filePath}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to encrypt secret ${key} at ${filePath}`, error);
      if (error instanceof Error) {
        vscode.window.showErrorMessage(error.message);
      }
      return null;
    }
  }

  /**
   * Run: dotenvx set [key] [secret] -f [filePath]
   */
  public async setSecretForKey(key: string, secret: string, filePath: string, encrypt = true) {
    if (!preferences.autoSearchForLocalDotenvxBinaryEnabled) {
      const result = dotenvx.set(key, secret, filePath, encrypt);
      const envFile = result.processedEnvFiles[0];
      if (envFile.error) {
        this.logger.error(
          `Failed to set secret ${key} at ${filePath}`,
          result.processedEnvFiles[0].error,
        );
        return null;
      }
      await fs.writeFile(envFile.envFilepath, envFile.envSrc, 'utf8');
      return 'success';
    }

    try {
      const result = await this.dotenvxExec(
        `set ${key} ${secret} -f ${filePath}${encrypt ? ' -c' : ''}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to set secret ${key} at ${filePath}`, error);
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
    if (!preferences.autoSearchForLocalDotenvxBinaryEnabled) {
      const result = dotenvx.get(key, [
        { type: 'envFile', value: filePath },
      ] as unknown as string[]);
      if (!result || typeof result !== 'string') {
        this.logger.error(`Failed to get secret ${key} at ${filePath}, type was ${typeof result}`);
        return null;
      }
      return result;
    }

    try {
      const result = await this.dotenvxExec(`get ${key} -f ${filePath}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to get secret ${key} at ${filePath}`, error);
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
