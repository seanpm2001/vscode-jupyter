// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

'use strict';

import { inject, injectable } from 'inversify';
import { NotebookDocument, notebooks, workspace } from 'vscode';
import { IExtensionSyncActivationService } from '../platform/activation/types';
import { IPythonExtensionChecker } from '../platform/api/types';
import { disposeAllDisposables } from '../platform/common/helpers';
import { IDisposable, IDisposableRegistry } from '../platform/common/types';
import { isJupyterNotebook } from '../platform/common/utils';
import { noop } from '../platform/common/utils/misc';
import { IInterpreterService } from '../platform/interpreter/contracts';
import { ServiceContainer } from '../platform/ioc/container';
import { IKernelFinder } from './types';

/**
 * Ensures we refresh the list of Python environments upon opening a Notebook.
 */
@injectable()
export class KernelRefresher implements IExtensionSyncActivationService {
    private readonly disposables: IDisposable[] = [];
    private startedRefreshing?: boolean;
    constructor(@inject(IDisposableRegistry) disposables: IDisposableRegistry) {
        disposables.push(this);
    }
    public dispose() {
        disposeAllDisposables(this.disposables);
    }
    public activate() {
        this.disposables.push(workspace.onDidOpenNotebookDocument(this.onDidOpenNotebookEditor, this));
    }

    private onDidOpenNotebookEditor(e: NotebookDocument) {
        const extensionChecker = ServiceContainer.instance.get<IPythonExtensionChecker>(IPythonExtensionChecker);
        if (!isJupyterNotebook(e) || !extensionChecker.isPythonExtensionInstalled) {
            return;
        }

        this.refreshKernels(e).catch(noop);
    }
    private async refreshKernels(notebook: NotebookDocument) {
        if (this.startedRefreshing) {
            return;
        }
        this.startedRefreshing = true;
        const task = notebooks.createNotebookControllerDetectionTask(notebook.notebookType);
        this.disposables.push(task);
        try {
            const interpreterService = ServiceContainer.instance.get<IInterpreterService>(IInterpreterService);
            const finder = ServiceContainer.instance.get<IKernelFinder>(IKernelFinder);
            await interpreterService.refreshInterpreters();
            if (finder.status === 'discovering') {
                await new Promise((resolve) => {
                    finder.onDidChangeStatus(
                        () => {
                            if (finder.status === 'idle') {
                                resolve();
                            }
                        },
                        this,
                        this.disposables
                    );
                });
            }
        } finally {
            task.dispose();
        }
    }
}
