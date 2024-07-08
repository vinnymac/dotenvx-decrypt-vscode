import * as vscode from 'vscode';
import * as path from 'path';

import { DotenvVirtualDocumentProvider } from './virtualDocumentProvider.js';
import { findDotenvxBinaryPath } from './findDotenvxBinaryPath.js';
import { autoRevealCommand } from './autoReveal.js';
import { dotenvxCommand } from './command.js';

export async function activate(context: vscode.ExtensionContext) {
  const convertCommand = vscode.commands.registerCommand('dotenvx.convertDotenv', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor found');
      return;
    }

    const document = editor.document;
    const converted = await dotenvxCommand.convert(document.fileName);
    if (converted) {
      vscode.window.showInformationMessage(`File has been converted using dotenvx`);
    }
  });
  context.subscriptions.push(convertCommand);

  const checkVersionCommand = vscode.commands.registerCommand('dotenvx.checkVersion', async () => {
    const version = await dotenvxCommand.checkVersion();
    if (version) {
      vscode.window.showInformationMessage(`dotenvx version: ${version}`);
    }
  });
  context.subscriptions.push(checkVersionCommand);

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
      if (document.uri.scheme !== DotenvVirtualDocumentProvider.scheme) {
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
      const key = await vscode.window.showQuickPick(Object.keys(decrypted), {
        title: 'Dotenvx: Copy Secret',
        placeHolder: 'Choose a secret key to copy',
        canPickMany: false,
      });

      if (!key) {
        vscode.window.showErrorMessage('No key provided unable to proceed.');
        return;
      }

      const dotenvSecret = await dotenvxCommand.getSecretForKey(key, editor.document.fileName);
      if (dotenvSecret) {
        await vscode.env.clipboard.writeText(dotenvSecret);
        vscode.window.showInformationMessage(
          `The secret for key "${key}" has been copied to your clipboard.`,
        );
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
          if (/[A-Z_]+[A-Z0-9_]*/.exec(value)) {
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

  setTimeout(async () => {
    const supported = await dotenvxCommand.checkVersionSupported();
    if (!supported) {
      vscode.window.showErrorMessage('Unsupported dotenvx version, must be 1.0.0 or higher');
    }
  }, 1000);
}

export function deactivate() {}
