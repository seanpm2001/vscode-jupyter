// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { EventEmitter } from 'vscode';
import { getKernelRegistrationInfo } from '../../kernels/helpers';
import { IJupyterUriProviderRegistration } from '../../kernels/jupyter/types';
import { KernelConnectionMetadata, RemoteKernelConnectionMetadata } from '../../kernels/types';
import { IDisposable } from '../../platform/common/types';
import { DataScience } from '../../platform/common/utils/localize';
import { EnvironmentType } from '../../platform/pythonEnvironments/info';
import { IConnectionDisplayData } from './types';
import { noop } from '../../platform/common/utils/misc';

export class ConnectionDisplayData implements IDisposable, IConnectionDisplayData {
    private readonly _onDidChange = new EventEmitter<ConnectionDisplayData>();
    public readonly onDidChange = this._onDidChange.event;

    constructor(
        public readonly connectionId: string,
        public label: string,
        public description: string | undefined,
        public detail: string,
        public category: string,
        public serverDisplayName?: string
    ) {}
    dispose(): void | undefined {
        this._onDidChange.dispose();
    }
    public triggerChange() {
        this._onDidChange.fire(this);
    }
}

// For Remote connections, check if we have a saved display name for the server.
export async function getRemoteServerDisplayName(
    kernelConnection: RemoteKernelConnectionMetadata,
    jupyterUriProviderRegistration: IJupyterUriProviderRegistration
): Promise<string> {
    const provider = await jupyterUriProviderRegistration
        .getProvider(kernelConnection.serverProviderHandle.extensionId, kernelConnection.serverProviderHandle.id)
        .catch(noop);

    const server = provider?.getServerUriWithoutAuth
        ? await provider?.getServerUriWithoutAuth(kernelConnection.serverProviderHandle.handle).catch(noop)
        : await provider?.getServerUri(kernelConnection.serverProviderHandle.handle).catch(noop);

    // We only show this if we have a display name and the name is not the same as the URI (this prevents showing the long token for user entered URIs).
    return server?.displayName || DataScience.kernelDefaultRemoteDisplayName;
}

export async function getKernelConnectionCategory(
    kernelConnection: KernelConnectionMetadata,
    jupyterUriProviderRegistration: IJupyterUriProviderRegistration
): Promise<string> {
    switch (kernelConnection.kind) {
        case 'connectToLiveRemoteKernel':
            const remoteDisplayNameSession = await getRemoteServerDisplayName(
                kernelConnection,
                jupyterUriProviderRegistration
            );
            return DataScience.kernelCategoryForJupyterSession(remoteDisplayNameSession);
        case 'startUsingRemoteKernelSpec':
            const remoteDisplayNameSpec = await getRemoteServerDisplayName(
                kernelConnection,
                jupyterUriProviderRegistration
            );
            return DataScience.kernelCategoryForRemoteJupyterKernel(remoteDisplayNameSpec);
        default:
            return getKernelConnectionCategorySync(kernelConnection);
    }
}
export function getKernelConnectionCategorySync(kernelConnection: KernelConnectionMetadata): string {
    switch (kernelConnection.kind) {
        case 'startUsingLocalKernelSpec':
            return DataScience.kernelCategoryForJupyterKernel;
        case 'startUsingPythonInterpreter': {
            if (
                getKernelRegistrationInfo(kernelConnection.kernelSpec) ===
                'registeredByNewVersionOfExtForCustomKernelSpec'
            ) {
                return DataScience.kernelCategoryForJupyterKernel;
            }
            switch (kernelConnection.interpreter.envType) {
                case EnvironmentType.Conda:
                    return kernelConnection.interpreter.isCondaEnvWithoutPython
                        ? DataScience.kernelCategoryForCondaWithoutPython
                        : DataScience.kernelCategoryForConda;
                case EnvironmentType.Pipenv:
                    return DataScience.kernelCategoryForPipEnv;
                case EnvironmentType.Poetry:
                    return DataScience.kernelCategoryForPoetry;
                case EnvironmentType.Pyenv:
                    return DataScience.kernelCategoryForPyEnv;
                case EnvironmentType.Venv:
                case EnvironmentType.VirtualEnv:
                case EnvironmentType.VirtualEnvWrapper:
                    return DataScience.kernelCategoryForVirtual;
                default:
                    return DataScience.kernelCategoryForGlobal;
            }
        }
        default:
            return '';
    }
}
