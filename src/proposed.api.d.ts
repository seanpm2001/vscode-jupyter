// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Disposable, Event, Uri } from 'vscode';

export interface JupyterServerAuthenticationInformation {
    baseUrl: Uri;
    /**
     * Jupyter auth Token
     */
    token: string;
    /**
     * Authorization header to be used when connecting to the server.
     */
    authorizationHeader?: Record<string, string>;
    /**
     * The local directory that maps to the remote directory of the Jupyter Server.
     * E.g. assume you start Jupyter Notebook with --notebook-dir=/foo/bar,
     * and you have a file named /foo/bar/sample.ipynb, /foo/bar/sample2.ipynb and the like.
     * Then assume the mapped local directory will be /users/xyz/remoteServer and the files sample.ipynb and sample2.ipynb
     * are in the above local directory.
     *
     * Using this setting one can map the local directory to the remote directory.
     * In this case the value of this property would be /users/xyz/remoteServer.
     *
     * Note: A side effect of providing this value is the session names are generated the way they are in Jupyter Notebook/Lab.
     * I.e. the session names map to the relative path of the notebook file.
     * As a result when attempting to create a new session for a notebook/file, Jupyter will
     * first check if a session already exists for the same file and same kernel, and if so, will re-use that session.
     */
    mappedRemoteNotebookDir?: string;
    /**
     * Returns the sub-protocols to be used. See details of `protocols` here https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/WebSocket
     * Useful if there is a custom authentication scheme that needs to be used for WebSocket connections.
     * Note: The client side npm package @jupyterlab/services uses WebSockets to connect to remote Kernels.
     */
    webSocketProtocols?: string[];
}

export type GetAuthenticationInformation = () => Promise<JupyterServerAuthenticationInformation>;
/**
 * The local directory that maps to the remote directory of the Jupyter Server.
 * E.g. assume you start Jupyter Notebook with --notebook-dir=/foo/bar,
 * and you have a file named /foo/bar/sample.ipynb, /foo/bar/sample2.ipynb and the like.
 * Then assume the mapped local directory will be /users/xyz/remoteServer and the files sample.ipynb and sample2.ipynb
 * are in the above local directory.
 *
 * Using this setting one can map the local directory to the remote directory.
 * In this case the value of this property would be /users/xyz/remoteServer.
 *
 * Note: A side effect of providing this value is the session names are generated the way they are in Jupyter Notebook/Lab.
 * I.e. the session names map to the relative path of the notebook file.
 * As a result when attempting to create a new session for a notebook/file, Jupyter will
 * first check if a session already exists for the same file and same kernel, and if so, will re-use that session.
 */
export type GetRemoteNotebookDirectoryMapping = () => string;

export interface JupyterServer extends Disposable {
    onDidRemove: Event<void>;
    id: string;
    label: string;
}

export class JupyterServerPicker extends Disposable {
    /**
     * A human-readable string which is rendered prominent. Supports rendering of {@link ThemeIcon theme icons} via
     * the `$(<name>)`-syntax.
     */
    label: string;
    /**
     * A human-readable string which is rendered less prominent in a separate line. Supports rendering of
     * {@link ThemeIcon theme icons} via the `$(<name>)`-syntax.
     */
    detail?: string;
    /**
     * A string that should be used when comparing this item
     * with other items. When `falsy` the {@link JupyterServerPicker.label label}
     * is used.
     */
    sortText?: string;
    /**
     * Optional flag indicating if this item is picked by default.
     * If there are no existing servers, and this flag is true, then this item will be picked by default.
     *
     * Note: this property is ignored when {@link JupyterServerCollection.createJupyterServer createJupyterServer} has been called.
     */
    picked?: boolean;
}

export class JupyterServerCollection extends Disposable {
    /**
     * Must be unique and should not change between sessions.
     */
    id: string;
    /**
     * A human-readable string which is rendered prominent.
     */
    label: string;
    /**
     * A link to a page providing more information to the user about this item.
     */
    documentation?: Uri;
    createJupyterServer(
        id: string,
        label: string,
        resolveAuthenticationInformation: GetAuthenticationInformation,
        getDirectoryMapping?: GetRemoteNotebookDirectoryMapping
    ): JupyterServer;
    createJupyterServerPicker(label: string, onDidSelect: () => PromiseLike<JupyterServer>): JupyterServerPicker;
}

export interface JupyterAPI {
    /**
     * Provides the ability to register multiple collections of Jupyter Servers.
     */
    createJupyterServerCollection(id: string, name: string): JupyterServerCollection;
}