import * as vscode from 'vscode';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const SCHEME = 'git-peel';

class GitPeelProvider implements vscode.TextDocumentContentProvider {
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  onDidChange = this._onDidChange.event;
  private _contents = new Map<string, string>();

  setContent(key: string, content: string) {
    this._contents.set(key, content);
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    return this._contents.get(uri.toString()) ?? '';
  }

  refresh(uri: vscode.Uri) {
    this._onDidChange.fire(uri);
  }

  clear(key: string) {
    this._contents.delete(key);
  }
}

export function activate(context: vscode.ExtensionContext) {
  const provider = new GitPeelProvider();
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(SCHEME, provider)
  );

  const cmd = vscode.commands.registerCommand('git-peel.showHistory', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const originalUri = editor.document.uri;
    const filePath = originalUri.fsPath;
    const viewColumn = editor.viewColumn ?? vscode.ViewColumn.One;

    const repoRoot = getRepoRoot(filePath);
    if (!repoRoot) {
      vscode.window.showErrorMessage('Git Peel: No git repository found.');
      return;
    }

    const commits = getCommitHistory(filePath, repoRoot);
    if (commits.length === 0) {
      vscode.window.showInformationMessage('Git Peel: No commits found for this file.');
      return;
    }

    const items = commits.map(c => ({
      label: `$(git-commit) ${c.hash.slice(0, 7)}`,
      description: c.date,
      detail: c.message,
      hash: c.hash,
    }));

    const previewUri = vscode.Uri.parse(
      `${SCHEME}:/preview/${path.basename(filePath)}`,
    );

    const quickPick = vscode.window.createQuickPick();
    quickPick.items = items;
    quickPick.title = `Git Peel — ${path.basename(filePath)}`;
    quickPick.placeholder = '↑↓ to preview commit • Enter to restore • Esc to cancel';
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;

    let previewOpen = false;

    const showPreview = async (hash: string) => {
      const content = getFileAtCommit(hash, filePath, repoRoot) ?? '(could not load)';
      provider.setContent(previewUri.toString(), content);

      if (!previewOpen) {
        const doc = await vscode.workspace.openTextDocument(previewUri);
        await vscode.window.showTextDocument(doc, {
          viewColumn,           
          preserveFocus: true,  
          preview: false,
        });
        previewOpen = true;
      } else {
        provider.refresh(previewUri);
      }
    };

    const restoreOriginal = async () => {
      const doc = await vscode.workspace.openTextDocument(originalUri);
      await vscode.window.showTextDocument(doc, {
        viewColumn,
        preserveFocus: false,
      });
      provider.clear(previewUri.toString());
    };

    quickPick.onDidChangeActive(async (active) => {
      if (!active[0]) return;
      const item = active[0] as typeof items[0];
      await showPreview(item.hash);
    });

    quickPick.onDidAccept(async () => {
      const item = quickPick.selectedItems[0] as typeof items[0];
      quickPick.hide();

      await restoreOriginal();

      if (!item) return;

      const confirm = await vscode.window.showWarningMessage(
        `Restore "${path.basename(filePath)}" to commit ${item.hash.slice(0, 7)}?\n"${item.detail}"`,
        { modal: true },
        'Restore'
      );

      if (confirm !== 'Restore') return;

      const content = getFileAtCommit(item.hash, filePath, repoRoot);
      if (content === null) {
        vscode.window.showErrorMessage('Git Peel: Failed to retrieve file content.');
        return;
      }

      fs.writeFileSync(filePath, content, 'utf8');
      vscode.window.showInformationMessage(
        `Git Peel: Restored to ${item.hash.slice(0, 7)} — ${item.detail}`
      );
    });

    quickPick.onDidHide(async () => {
      if (previewOpen) {
        await restoreOriginal();
      }
      quickPick.dispose();
    });

    quickPick.show();
    if (items.length > 0) {
      await showPreview(items[0].hash);
    }
  });

  context.subscriptions.push(cmd);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getRepoRoot(filePath: string): string | null {
  try {
    return execSync('git rev-parse --show-toplevel', {
      cwd: path.dirname(filePath),
      encoding: 'utf8',
    }).trim();
  } catch {
    return null;
  }
}

interface Commit { hash: string; date: string; message: string; }

function getCommitHistory(filePath: string, repoRoot: string): Commit[] {
  try {
    const relativePath = path.relative(repoRoot, filePath);
    const raw = execSync(
      `git log --follow --format="%H|%ad|%s" --date=short -- "${relativePath}"`,
      { cwd: repoRoot, encoding: 'utf8' }
    );
    return raw.trim().split('\n').filter(Boolean).map(line => {
      const [hash, date, ...rest] = line.split('|');
      return { hash, date, message: rest.join('|') };
    });
  } catch { return []; }
}

function getFileAtCommit(hash: string, filePath: string, repoRoot: string): string | null {
  try {
    const relativePath = path.relative(repoRoot, filePath);
    return execSync(`git show ${hash}:"${relativePath}"`, {
      cwd: repoRoot, encoding: 'utf8',
    });
  } catch { return null; }
}

export function deactivate() {}