import * as vscode from 'vscode';

import { decorator } from './textEditorDecorator.js';
import { Preferences, preferences } from './preferences.js';
import { LogService } from './LogService.js';
import { CodeLensProvider } from './codeLens.js';

class AutoReveal {
  private logger = new LogService();

  async configureListeners(context: vscode.ExtensionContext) {
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      await decorator.redecorate(context, editor);
    });
    vscode.workspace.onDidOpenTextDocument(async (event) => {
      const [openEditor] = vscode.window.visibleTextEditors.filter((editor) => {
        try {
          return editor.document.uri === event.uri;
        } catch (error) {
          this.logger.error('Failed to compare editor document uris', error);
          return false;
        }
      });
      await decorator.redecorate(context, openEditor);
    });

    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration(Preferences.keys.enableAutoReveal)) {
        await decorator.redecorate(context, vscode.window.activeTextEditor);
      }
    });
  }

  async runAutoRevealCommand() {
    if (preferences.autoRevealEnabled) {
      await preferences.autoRevealToggle(false);
    } else {
      await preferences.autoRevealToggle(true);
    }
  }

  async register(context: vscode.ExtensionContext) {
    decorator.redecorate(context, vscode.window.activeTextEditor);

    await this.configureListeners(context);

    const commandSubs = [];
    if (preferences.displayAutoRevealCodeLensEnabled) {
      const codelensProvider = new CodeLensProvider();
      const codeLens = vscode.languages.registerCodeLensProvider(
        { scheme: 'file', pattern: '**/.env*' },
        codelensProvider
      );

      commandSubs.push(codeLens);
    }

    const toggleSecretVisibilityCmd = vscode.commands.registerCommand(
      'dotenvx.toggleSecretVisibility',
      async () => {
        await this.runAutoRevealCommand();
      }
    );
    commandSubs.push(toggleSecretVisibilityCmd);
    const toggleSecretVisibilityTouchbarCmd = vscode.commands.registerCommand(
      'dotenvx.toggleSecretVisibilityTouchbar',
      async () => {
        await this.runAutoRevealCommand();
      }
    );
    commandSubs.push(toggleSecretVisibilityTouchbarCmd);

    const disableSecretVisibilityCmd = vscode.commands.registerCommand(
      'dotenvx.hideSecrets',
      async () => {
        await this.runAutoRevealCommand();
      }
    );
    commandSubs.push(disableSecretVisibilityCmd);

    const enableSecretVisibilityCmd = vscode.commands.registerCommand(
      'dotenvx.showSecrets',
      async () => {
        await this.runAutoRevealCommand();
      }
    );
    commandSubs.push(enableSecretVisibilityCmd);

    return commandSubs;
  }
}

export const autoRevealCommand = new AutoReveal();
