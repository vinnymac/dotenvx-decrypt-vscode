import * as vscode from 'vscode';

import { preferences } from './preferences.js';

export class CodeLensProvider implements vscode.CodeLensProvider {
  private codeLenses: vscode.CodeLens[] = [];
  private topOfFileRange = new vscode.Range(0, 1, 10, 10);
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  constructor() {
    vscode.workspace.onDidChangeConfiguration((_) => {
      this._onDidChangeCodeLenses.fire();
    });
  }

  public provideCodeLenses(
    _document: vscode.TextDocument,
    _token: vscode.CancellationToken,
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    this.codeLenses = [new vscode.CodeLens(this.topOfFileRange, this.getCodeLensCommand())];
    return this.codeLenses;
  }

  public resolveCodeLens(codeLens: vscode.CodeLens, _token: vscode.CancellationToken) {
    codeLens.command = this.getCodeLensCommand();
    return codeLens;
  }

  private getCodeLensCommand() {
    const title = preferences.autoRevealEnabled ? 'Hide Secrets' : 'Reveal Secrets';
    return {
      title,
      tooltip: title,
      command: 'dotenvx.toggleSecretVisibility',
    };
  }
}
