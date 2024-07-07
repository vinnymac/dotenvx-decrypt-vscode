import * as vscode from 'vscode';
import * as path from 'path';

import { DotenvVirtualDocumentProvider } from './virtualDocumentProvider.js';
import { findDotenvxBinaryPath } from './findDotenvxBinaryPath.js';
import { autoRevealCommand } from './autoReveal.js';
import { dotenvxCommand } from './command.js';
import { preferences } from './preferences.js';

export async function activate(context: vscode.ExtensionContext) {
  const supported = await dotenvxCommand.checkVersionSupported();
  if (!supported) {
    vscode.window.showErrorMessage(
      'Unsupported dotenvx version, must be 1.0.0 or higher'
    );
  }

  const convertCommand = vscode.commands.registerCommand('dotenvx.convertDotenv', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor found');
      return;
    }

    const document = editor.document;
    const converted = await dotenvxCommand.convert(document.fileName);
    if (converted) {
      vscode.window.showInformationMessage(
        `File has been converted using dotenvx`
      );
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
  const providerDisposable =
    vscode.workspace.registerTextDocumentContentProvider(
      DotenvVirtualDocumentProvider.scheme,
      provider
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
        vscode.window.showErrorMessage(
          `Incorrect scheme: ${document.uri.scheme}`
        );
        return;
      }

      const file = path.basename(document.fileName);
      if (!dotenvxCommand.isSupportedFile(file)) {
        vscode.window.showErrorMessage(
          `The open document (${file}) is not supported, try a .env file.`
        );
        return;
      }

      const dotenvxPath = await findDotenvxBinaryPath();
      if (!dotenvxPath) {
        vscode.window.showErrorMessage(
          'dotenvx binary not found. Please install dotenvx globally or in your project, then try again.'
        );
        return;
      }

      const uri = vscode.Uri.parse(
        `${DotenvVirtualDocumentProvider.scheme}://${document.fileName}`
      );
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, { preview: false });
    }
  );
  context.subscriptions.push(showDecryptedCommand);

  const autoRevealCommands = await autoRevealCommand.register(context);
  context.subscriptions.push(...autoRevealCommands);
}

export function deactivate() {}
