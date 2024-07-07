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
}

export const preferences = new Preferences();
