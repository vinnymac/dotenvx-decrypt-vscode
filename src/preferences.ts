import * as vscode from 'vscode';

export class Preferences {
  private static get userConfig() {
    return vscode.workspace.getConfiguration();
  }

  /**
   * Keep in sync w/ package 'dotenvx'
   */
  public static keys = {
    enableAutoReveal: 'dotenvx.enableAutoReveal',
    displayAutoRevealCodeLens: 'dotenvx.displayAutoRevealCodeLens',
    displayAutoRevealNavigationButton: 'dotenvx.displayAutoRevealNavigationButton',
    displayCopyToClipboardButton: 'dotenvx.displayCopyToClipboardButton',
    displaySetSecretButton: 'dotenvx.displaySetSecretButton',
    displayContextMenuCopySecretOnLine: 'dotenvx.displayContextMenuCopySecretOnLine',
    displayContextMenuDecryptSecretOnLine: 'dotenvx.displayContextMenuDecryptSecretOnLine',
    displayContextMenuEncryptSecretOnLine: 'dotenvx.displayContextMenuEncryptSecretOnLine',
    autoSearchForLocalDotenvxBinary: 'dotenvx.autoSearchForLocalDotenvxBinary',
  };

  public async autoRevealToggle(toggle: boolean) {
    await Preferences.userConfig.update(
      Preferences.keys.enableAutoReveal,
      toggle,
      vscode.ConfigurationTarget.Global,
    );
  }

  get autoRevealEnabled() {
    return Boolean(Preferences.userConfig.get(Preferences.keys.enableAutoReveal));
  }

  get displayAutoRevealCodeLensEnabled() {
    return Boolean(Preferences.userConfig.get(Preferences.keys.displayAutoRevealCodeLens));
  }

  get displayAutoRevealNavigationButtonEnabled() {
    return Boolean(Preferences.userConfig.get(Preferences.keys.displayAutoRevealNavigationButton));
  }

  get displayCopyToClipboardButtonEnabled() {
    return Boolean(Preferences.userConfig.get(Preferences.keys.displayCopyToClipboardButton));
  }

  get displaySetSecretButtonEnabled() {
    return Boolean(Preferences.userConfig.get(Preferences.keys.displaySetSecretButton));
  }

  get displayContextMenuCopySecretOnLineEnabled() {
    return Boolean(Preferences.userConfig.get(Preferences.keys.displayContextMenuCopySecretOnLine));
  }

  get autoSearchForLocalDotenvxBinaryEnabled() {
    return Boolean(Preferences.userConfig.get(Preferences.keys.autoSearchForLocalDotenvxBinary));
  }

  get displayContextMenuDecryptSecretOnLineEnabled() {
    return Boolean(
      Preferences.userConfig.get(Preferences.keys.displayContextMenuDecryptSecretOnLine),
    );
  }

  get displayContextMenuEncryptSecretOnLineEnabled() {
    return Boolean(
      Preferences.userConfig.get(Preferences.keys.displayContextMenuEncryptSecretOnLine),
    );
  }
}

export const preferences = new Preferences();
