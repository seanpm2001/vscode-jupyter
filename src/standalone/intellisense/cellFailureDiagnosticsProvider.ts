// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import {
    DiagnosticSeverity,
    NotebookCell,
    Position,
    languages,
    Range,
    workspace,
    extensions,
    NotebookDocumentChangeEvent
} from 'vscode';
import { IDisposable } from '../../platform/common/types';
import { IExtensionSyncActivationService } from '../../platform/activation/types';
import { injectable } from 'inversify';

@injectable()
export class CellFailureDiagnosticsProvider implements IExtensionSyncActivationService {
    activate(): void {
        workspace.onDidChangeNotebookDocument(this.onDidChangeNotebookDocument);
    }

    private onDidChangeNotebookDocument(e: NotebookDocumentChangeEvent) {
        for (const change of e.cellChanges) {
            if (change.executionSummary) {
                if (!change.executionSummary.success) {
                    for (const output of change.cell.outputs) {
                        if (output.metadata?.outputType === 'error') {
                            const traceback = output.metadata?.originalError?.traceback;
                            const errorName = output.metadata?.ename;
                            const errorValue = output.metadata?.evalue;
                            if (traceback && errorName && errorName !== 'KeyboardInterrupt') {
                                const message = `${errorName}: ${errorValue}`;
                                this.addFailureDiagnostic(traceback, message, change.cell);
                            }
                        }
                    }
                }
            }
        }
    }

    public addFailureDiagnostic(traceback: string[], message: string, cell: NotebookCell) {
        if (!this.shouldAddDiagnostics()) {
            return;
        }

        const { range, executionCount } = this.parseStackTrace(traceback, cell);

        if (range) {
            const diagnostics = languages.createDiagnosticCollection('cellFailure');
            diagnostics.set(cell.document.uri, [
                {
                    code: '',
                    message,
                    range,
                    severity: DiagnosticSeverity.Error,
                    source: 'Cell Execution Failure',
                    relatedInformation: []
                }
            ]);

            let listeners: IDisposable[] = [];
            listeners.push(
                workspace.onDidChangeNotebookDocument((e) => {
                    if (e.notebook.uri.toString() === cell.notebook.uri.toString()) {
                        for (const cellChange of e.cellChanges) {
                            if (
                                cellChange.cell.document.uri.toString() === cell.document.uri.toString() &&
                                cellChange.executionSummary?.executionOrder &&
                                cellChange.executionSummary.executionOrder !== executionCount
                            ) {
                                diagnostics.clear();
                                listeners.forEach((l) => l.dispose());
                            }
                        }
                    }
                })
            );

            listeners.push(
                workspace.onDidChangeTextDocument((e) => {
                    if (e.document.uri.toString() === cell.document.uri.toString()) {
                        diagnostics.clear();
                        listeners.forEach((l) => l.dispose());
                    }
                })
            );
        }
    }

    private shouldAddDiagnostics() {
        const extensionId = 'github.copilot';
        const extension = extensions.getExtension(extensionId);

        return (
            workspace.getConfiguration('jupyter').get<boolean>('experimental.cellFailureDiagnostics.enabled') &&
            extension?.isActive
        );
    }

    private parseStackTrace(traceback: string[], cell: NotebookCell) {
        const cellRegex =
            /(?<prefix>Cell\s+(?:\u001b\[.+?m)?In\s*\[(?<executionCount>\d+)\],\s*)(?<lineLabel>line (?<lineNumber>\d+)).*/;
        // older versions of IPython ~8.3.0
        const inputRegex =
            /(?<prefix>Input\s+?(?:\u001b\[.+?m)(?<cellLabel>In\s*\[(?<executionCount>\d+)\]))(?<postfix>.*)/;
        let lineNumber: number | undefined = undefined;
        let executionCount: number | undefined = undefined;
        for (const line of traceback) {
            const lineMatch = cellRegex.exec(line) ?? inputRegex.exec(line);
            if (lineMatch && lineMatch.groups) {
                lineNumber = parseInt(lineMatch.groups['lineNumber']);
                executionCount = parseInt(lineMatch.groups['executionCount']);
                break;
            }
        }

        let range: Range | undefined = undefined;
        if (lineNumber) {
            const line = cell.document.lineAt(lineNumber - 1);
            const end = line.text.split('#')[0].trimEnd().length;

            range = new Range(
                new Position(line.lineNumber, line.firstNonWhitespaceCharacterIndex),
                new Position(line.lineNumber, end)
            );
        }

        return { range, executionCount };
    }
}
