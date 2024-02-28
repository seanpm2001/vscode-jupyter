// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Uri, workspace } from 'vscode';
import { PythonEnvironment } from '../../pythonEnvironments/info';
import { Environment } from '@vscode/python-extension';
import { getRootFolder } from '../../common/application/workspace.base';
import { getEnvironmentExecutable } from '../helpers';

/**
 * Returns the workspace folder this interpreter is based in or the root if not a virtual env
 */
export function getInterpreterWorkspaceFolder(interpreter: PythonEnvironment | Environment): Uri | undefined {
    const uri = getEnvironmentExecutable(interpreter);
    if (!uri) {
        return;
    }
    const folder = workspace.getWorkspaceFolder(uri);
    return folder?.uri || getRootFolder();
}
