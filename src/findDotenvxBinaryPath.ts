import * as vscode from 'vscode';
import { findUp } from 'find-up';
import * as cp from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as util from 'node:util';

const execAsync = util.promisify(cp.exec);

export async function findDotenvxBinaryPath(): Promise<string | null> {
  try {
    // Lookup globally installed binary
    const { stdout, stderr } = await execAsync('which dotenvx');
    if (stderr) {
      throw new Error(stderr);
    }
    const globalPath = stdout.toString().trim();
    if (globalPath) {
      return globalPath;
    }
  } catch (error) {}

  // Check local node_modules
  if (!vscode.workspace.workspaceFolders && vscode.workspace.rootPath) {
    const localPath = path.join(vscode.workspace.rootPath, 'node_modules', '.bin', 'dotenvx');
    if (fs.existsSync(localPath)) {
      return localPath;
    }
  }

  if (vscode.workspace.workspaceFolders) {
    for (const folder of Array.from(vscode.workspace.workspaceFolders)) {
      const localPath = path.join(folder.uri.fsPath, 'node_modules', '.bin', 'dotenvx');
      if (fs.existsSync(localPath)) {
        return localPath;
      }
    }
  }

  const found = await findUp('node_modules/.bin/dotenvx');
  if (found) {
    return found;
  }

  return null;
}
