import * as vscode from 'vscode';
import * as path from 'path';

import { preferences } from './preferences.js';
import { LogService } from './LogService.js';
import { dotenvxCommand } from './command.js';

class TextEditorDecorator {
  private maskDecoration = vscode.window.createTextEditorDecorationType({
    letterSpacing: '-1ch',
    opacity: '0',
  });

  private logger = new LogService();

  private buildPatches(sourceCode: string, decryptedDotenv: Record<string, string>) {
    const patches = [];
    const regex = /([A-Z_][A-Z_0-9]*)=(.+)/;
    let lineIndex = 0;

    const lines = sourceCode.split('\n');
    for (const line of lines) {
      lineIndex += 1;
      regex.lastIndex = 0;
      const matches = regex.exec(line);

      if (!matches) {
        continue;
      }
      const [, key, encryptedSecret] = matches;
      if (key.startsWith('DOTENV_PUBLIC_KEY')) {
        continue;
      }

      if (!encryptedSecret) {
        continue;
      }

      const secret = decryptedDotenv[key];
      if (!secret) {
        continue;
      }

      const startIndex = line.indexOf(encryptedSecret);
      const endIndex = startIndex + encryptedSecret.length;

      patches.push({
        key,
        secret,
        encryptedSecret,
        start: { line: lineIndex, column: startIndex },
        end: { line: lineIndex, column: endIndex },
      });
    }

    return patches;
  }

  private apply(
    _ctx: vscode.ExtensionContext,
    editor: vscode.TextEditor,
    patches: ReturnType<typeof this.buildPatches>,
  ) {
    const decorations = patches.map((patch) => {
      const range = new vscode.Range(
        new vscode.Position(patch.start.line - 1, patch.start.column),
        new vscode.Position(patch.end.line - 1, patch.end.column),
      );

      return {
        range,
        hoverMessage: `Decrypted from ${patch.encryptedSecret}`,
        renderOptions: {
          after: {
            contentText: `"${patch.secret}"`,
            // Can't get tm theme color, so use our own
            // https://github.com/microsoft/vscode/issues/32813
            color: '#328f8f',
          },
        },
      } satisfies vscode.DecorationOptions;
    });

    editor.setDecorations(this.maskDecoration, decorations);
  }

  public async redecorate(context: vscode.ExtensionContext, editor: vscode.TextEditor | undefined) {
    if (!editor) {
      return;
    }
    const filename = path.basename(editor.document.uri.fsPath);
    if (!dotenvxCommand.isSupportedFile(filename)) {
      return;
    }

    try {
      if (!preferences.autoRevealEnabled) {
        this.apply(context, editor, []);
      } else {
        const decryptedDotenv = await dotenvxCommand.getDecrypted(editor.document.fileName);
        const sourceCode = editor.document.getText();
        const patches = this.buildPatches(sourceCode, decryptedDotenv);
        this.apply(context, editor, patches);
      }
    } catch (e) {
      this.logger.error('Failed to decorate dotenv', e);
    }
  }
}

export const decorator = new TextEditorDecorator();
