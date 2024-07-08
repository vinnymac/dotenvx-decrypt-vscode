import * as vscode from 'vscode';
import * as util from 'node:util';
import * as cp from 'node:child_process';
import * as fs from 'node:fs';
import * as rl from 'node:readline';

import { findDotenvxBinaryPath } from './findDotenvxBinaryPath.js';
import { dotenvxCommand } from './command.js';

export class DotenvVirtualDocumentProvider implements vscode.TextDocumentContentProvider {
  static scheme = 'dotenvx';

  private async processLineByLine(filePath: string, result: Record<string, string>) {
    const fileStream = fs.createReadStream(filePath);

    const readline = rl.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let decryptedFileContent =
      '#/ The secrets 🤫 in this file have been ⚜️ decrypted ⚜️ by dotenvx\n\n';

    const regex = /([a-zA-Z_][a-zA-Z_0-9]*)=/;
    for await (const line of readline) {
      const matches = regex.exec(line);
      regex.lastIndex = 0;
      if (matches) {
        const [, key] = matches;
        const decryptedValue = result[key];
        if (decryptedValue) {
          decryptedFileContent += `${key}="${decryptedValue}"\n`;
          continue;
        }
      }
      decryptedFileContent += `${line}\n`;
    }
    return decryptedFileContent;
  }

  private async asyncProvideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const dotenvxPath = await findDotenvxBinaryPath();
    if (!dotenvxPath) {
      vscode.window.showErrorMessage(
        'dotenvx binary not found. Please install dotenvx globally or in your project, then try again.',
      );
      return '';
    }

    const filePath = uri.path;
    const decryptedDotenv = await dotenvxCommand.getDecrypted(filePath);
    const decryptedContent = await this.processLineByLine(filePath, decryptedDotenv);
    return decryptedContent;
  }

  provideTextDocumentContent(uri: vscode.Uri): vscode.ProviderResult<string> {
    return this.asyncProvideTextDocumentContent(uri);
  }
}
