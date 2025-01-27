import * as vscode from 'vscode';
import * as path from 'node:path';

import { DotenvVirtualDocumentProvider } from './virtualDocumentProvider.js';
import { findDotenvxBinaryPath } from './findDotenvxBinaryPath.js';
import { autoRevealCommand } from './autoReveal.js';
import { dotenvxCommand } from './command.js';
import { preferences } from './preferences.js';

export async function activate(context: vscode.ExtensionContext) {
  const encryptCommand = vscode.commands.registerCommand('dotenvx.encryptDotenv', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor found');
      return;
    }

    const document = editor.document;
    const encrypted = await dotenvxCommand.encrypt(document.fileName);
    if (encrypted) {
      vscode.window.showInformationMessage(`File has been encrypted using dotenvx`);
    }
  });
  context.subscriptions.push(encryptCommand);

  if (preferences.autoSearchForLocalDotenvxBinaryEnabled) {
    const checkVersionCommand = vscode.commands.registerCommand(
      'dotenvx.checkVersion',
      async () => {
        const version = await dotenvxCommand.checkVersion();
        if (version) {
          vscode.window.showInformationMessage(`dotenvx version: ${version}`);
        }
      },
    );
    context.subscriptions.push(checkVersionCommand);
  }

  const provider = new DotenvVirtualDocumentProvider();
  const providerDisposable = vscode.workspace.registerTextDocumentContentProvider(
    DotenvVirtualDocumentProvider.scheme,
    provider,
  );
  context.subscriptions.push(providerDisposable);

  const showDecryptedCommand = vscode.commands.registerCommand(
    'dotenvx.showDecryptedDotenv',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      const document = editor.document;
      if (document.uri.scheme !== 'file') {
        vscode.window.showErrorMessage(`Incorrect scheme: ${document.uri.scheme}`);
        return;
      }

      const file = path.basename(document.fileName);
      if (!dotenvxCommand.isSupportedFile(file)) {
        vscode.window.showErrorMessage(
          `The open document (${file}) is not supported, try a .env file.`,
        );
        return;
      }

      const dotenvxPath = await findDotenvxBinaryPath();
      if (!dotenvxPath) {
        vscode.window.showErrorMessage(
          'dotenvx binary not found. Please install dotenvx globally or in your project, then try again.',
        );
        return;
      }

      const uri = vscode.Uri.parse(
        `${DotenvVirtualDocumentProvider.scheme}://${document.fileName}`,
      );
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, { preview: false });
    },
  );
  context.subscriptions.push(showDecryptedCommand);

  const autoRevealCommands = await autoRevealCommand.register(context);
  context.subscriptions.push(...autoRevealCommands);

  const copySecretForKeyCmd = vscode.commands.registerCommand(
    'dotenvx.copySecretForKey',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('No active editor found');
        return;
      }

      const decrypted = await dotenvxCommand.getDecrypted(editor.document.fileName);
      if (!decrypted.success) {
        vscode.window.showErrorMessage(decrypted.failure);
        return;
      }
      const key = await vscode.window.showQuickPick(Object.keys(decrypted.success), {
        title: 'Dotenvx: Copy Secret',
        placeHolder: 'Choose a secret key to copy',
        canPickMany: false,
      });

      if (!key) {
        vscode.window.showErrorMessage('No key provided unable to proceed.');
        return;
      }

      const dotenvSecret = await dotenvxCommand.getSecretForKey(key, editor.document.fileName);
      if (dotenvSecret.success) {
        await vscode.env.clipboard.writeText(dotenvSecret.success);
        vscode.window.showInformationMessage(`Copied "${key}" to clipboard.`);
      } else if (dotenvSecret.failure) {
        vscode.window.showErrorMessage(dotenvSecret.failure);
      }
    },
  );
  context.subscriptions.push(copySecretForKeyCmd);

  const setSecretForKeyCmd = vscode.commands.registerCommand(
    'dotenvx.setSecretForKey',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('No active editor found');
        return;
      }

      const key = await vscode.window.showInputBox({
        title: 'Dotenvx: Enter Secret Key',
        prompt: 'Examples: DB_PASSWORD, RESEND_API_KEY, REDIS_CLUSTER_ENDPOINT',
        placeHolder: 'Enter a secret key',
        validateInput(value: string) {
          if (/[a-zA-Z_][a-zA-Z_0-9]*/.exec(value)) {
            return null;
          }
          return 'Your secret key must only include the characters: _ A-Z 0-9, and start with: _ A-Z';
        },
      });

      if (!key) {
        vscode.window.showErrorMessage('No key provided unable to proceed.');
        return;
      }

      const secret = await vscode.window.showInputBox({
        title: 'Dotenvx: Enter Secret',
        prompt: 'Be careful when sharing secrets, take your time, you are worth it!',
        placeHolder: `Enter your secret for "${key}"`,
        password: true,
      });

      if (!secret) {
        vscode.window.showErrorMessage('No secret provided unable to proceed.');
        return;
      }

      await dotenvxCommand.setSecretForKey(key, secret, editor.document.fileName);
    },
  );
  context.subscriptions.push(setSecretForKeyCmd);

  const copySecretOnLineCmd = vscode.commands.registerCommand(
    'dotenvx.copySecretOnLine',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('No active editor found');
        return;
      }

      const lineText = editor.document.lineAt(editor.selection.active.line);
      const matches = /([a-zA-Z_][a-zA-Z_0-9]*)=/.exec(lineText.text.trim());
      if (!matches) {
        vscode.window.showErrorMessage('Nothing to copy.');
        return;
      }

      const [, key] = matches;
      const dotenvSecret = await dotenvxCommand.getSecretForKey(key, editor.document.fileName);
      if (dotenvSecret.success) {
        await vscode.env.clipboard.writeText(dotenvSecret.success);
        vscode.window.showInformationMessage(`Copied "${key}" to clipboard.`);
      } else if (dotenvSecret.failure) {
        vscode.window.showErrorMessage(dotenvSecret.failure);
      }
    },
  );
  context.subscriptions.push(copySecretOnLineCmd);

  const decryptSecretOnLineCmd = vscode.commands.registerCommand(
    'dotenvx.decryptSecretOnLine',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('No active editor found');
        return;
      }

      const lineText = editor.document.lineAt(editor.selection.active.line);
      const matches = /([a-zA-Z_][a-zA-Z_0-9]*)=['"]?([^'"]+)['"]?/.exec(lineText.text.trim());
      if (!matches) {
        vscode.window.showErrorMessage('Nothing to decrypt.');
        return;
      }

      const [, key, value] = matches;
      if (!key) {
        vscode.window.showErrorMessage('No secret key found unable to proceed.');
        return;
      } else if (/^DOTENV_PUBLIC_KEY/.test(key)) {
        vscode.window.showErrorMessage('The public key cannot be decrypted.');
        return;
      } else if (value && !/^encrypted:.+/.test(value)) {
        vscode.window.showErrorMessage('The secret is not encrypted.');
        return;
      }
      const dotenvSecret = await dotenvxCommand.getSecretForKey(key, editor.document.fileName);
      if (dotenvSecret.success) {
        await dotenvxCommand.setSecretForKey(
          key,
          dotenvSecret.success,
          editor.document.fileName,
          false,
        );
        vscode.window.showInformationMessage(
          `The secret "${key}" has been decrypted in ${path.basename(editor.document.fileName)}.`,
        );
      } else if (dotenvSecret.failure) {
        vscode.window.showErrorMessage(dotenvSecret.failure);
      }
    },
  );
  context.subscriptions.push(decryptSecretOnLineCmd);

  const encryptSecretOnLineCmd = vscode.commands.registerCommand(
    'dotenvx.encryptSecretOnLine',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('No active editor found');
        return;
      }

      const lineText = editor.document.lineAt(editor.selection.active.line);
      const matches = /([a-zA-Z_][a-zA-Z_0-9]*)=['"]?([^'"]+)['"]?/.exec(lineText.text.trim());
      if (!matches) {
        vscode.window.showErrorMessage('Nothing to encrypt.');
        return;
      }

      const [, key, value] = matches;
      if (!key) {
        vscode.window.showErrorMessage('No secret key found unable to proceed.');
        return;
      } else if (/^DOTENV_PUBLIC_KEY/.test(key)) {
        vscode.window.showErrorMessage('The public key should never be encrypted.');
        return;
      } else if (value && /^encrypted:.+/.test(value)) {
        vscode.window.showErrorMessage('The secret is already encrypted.');
        return;
      }
      await dotenvxCommand.encrypt(editor.document.fileName, key);
      vscode.window.showInformationMessage(
        `The secret "${key}" has been encrypted in ${path.basename(editor.document.fileName)}.`,
      );
    },
  );
  context.subscriptions.push(encryptSecretOnLineCmd);

  setTimeout(async () => {
    if (!preferences.autoSearchForLocalDotenvxBinaryEnabled) {
      return;
    }
    const supported = await dotenvxCommand.checkVersionSupported();
    if (!supported) {
      vscode.window.showErrorMessage('Unsupported dotenvx version, must be 1.0.0 or higher');
    }
  }, 1000);
}

export function deactivate() {}
