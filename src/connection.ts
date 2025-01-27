/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { encrypt } from './utils';
//import * as https from 'https';
//import axios from 'axios';
import { Sandbox } from './sandbox';
import { Gitlab } from './gitlab';
import { globalConfig } from './globals';
import { md5 } from "hash-wasm";

export class Connection {

    private provider?: ConnectionsViewProvider;

    async wizard() {

        const gitlabUsername = await vscode.window.showInputBox({
            prompt: 'Usuario de Gitlab: ',
            placeHolder: ''
        });
        const gitlabToken = await vscode.window.showInputBox({
            prompt: 'Token de Gitlab: ',
            placeHolder: '',
            password: true
        });

        if (gitlabUsername && gitlabToken) {
            const configuration = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
            await configuration.update('username', gitlabUsername, vscode.ConfigurationTarget.Global);
            await configuration.update('token', encrypt(gitlabToken), vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`TAMBO-SANDBOX: Se configuró la conexión exitosamente`);
        }

    }

    async edit() {

        const configuration = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
        const currentUsername = configuration.get('username');
        const currentToken = configuration.get('token'); // Desencripta si es necesario

        // Solicita el nuevo usuario
        const nuevoGitlabUsername = await vscode.window.showInputBox({
            prompt: 'Usuario de Gitlab: ',
            placeHolder: 'Deja en blanco para mantener el actual',
            value: currentUsername ? String(currentUsername) : '' // Asegura que siempre sea un string
        });

        // Solicita el nuevo token
        const nuevoGitlabToken = await vscode.window.showInputBox({
            prompt: 'Token de Gitlab: ',
            placeHolder: 'Deja en blanco para mantener el actual',
            password: true
        });

        // Actualiza la configuración si el usuario proporciona nuevos valores
        if (nuevoGitlabUsername || nuevoGitlabToken) {
            if (nuevoGitlabUsername) {
                await configuration.update('username', nuevoGitlabUsername, vscode.ConfigurationTarget.Global);
            }

            if (nuevoGitlabToken) {
                await configuration.update('token', encrypt(nuevoGitlabToken), vscode.ConfigurationTarget.Global);
            }

            vscode.window.showInformationMessage(`TAMBO-SANDBOX: Se configuró la conexión exitosamente`);
        } else {
            vscode.window.showInformationMessage('TAMBO-SANDBOX: Fallo al intentar configurar la conexión');
        }

    }

    async delete() {

        const respuesta = await vscode.window.showInformationMessage(
            '¿Estás seguro de que deseas eliminar la configuración de conexión a TAMBO Sandbox?',
            { modal: true }, // Modal para enfatizar la confirmación
            'Sí'
        );

        if (respuesta === 'Sí') {
            const configuration = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
            await configuration.update('username', undefined, vscode.ConfigurationTarget.Global);
            await configuration.update('token', undefined, vscode.ConfigurationTarget.Global);

            vscode.window.showInformationMessage('TAMBO-SANDBOX: Se elimino la configuracion');
        }

    }

    load(context: vscode.ExtensionContext) {

        try {
            // Crear una única instancia del proveedor
            this.provider = new ConnectionsViewProvider(context);

            context.subscriptions.push(
                vscode.window.registerWebviewViewProvider(
                    ConnectionsViewProvider.viewType,
                    this.provider
                )
            );
        } catch (error) {
            console.error("TAMBOSANDBOX.connection.load: ", error);
        }

    }

    isConfigured(): boolean {

        const config = vscode.workspace.getConfiguration('tambo.sandbox');
        return (
            config.get<string>('gitlab.username')?.trim() !== "" &&
            config.get<string>('gitlab.token')?.trim() !== ""
        );

    }

    refresh() {

        if (this.provider) {
            this.provider.refreshView();
        } else {
            console.error("TAMBOSANDBOX.connection.refresh: No se pudo actualizar la vista.");
        }

    }
}

class ConnectionsViewProvider implements vscode.WebviewViewProvider {

    static viewType = 'tambo_viewport_connection';
    private context: vscode.ExtensionContext;
    private webviewView?: vscode.WebviewView;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext<unknown>,
        token: vscode.CancellationToken
    ): void | Thenable<void> {
        this.webviewView = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
        };

        this.updateWebviewContent();

        vscode.commands.executeCommand('setContext', 'tambo.configDefined', new Connection().isConfigured());

        webviewView.webview.onDidReceiveMessage(async (message) => {

            switch (message.command) {

                case 'sandboxStatus':
                    const htmlStatusSandbox = await updateStatus(this.context.extensionUri);
                    const hash = (await md5(htmlStatusSandbox)).slice(-5);

                    if (globalConfig.workspaceStatusHash !== hash) {

                        globalConfig.workspaceStatusHash = hash;
                        webviewView.webview.postMessage({
                            command: 'sandboxConnectionStatus',
                            data: htmlStatusSandbox,
                        });

                    }
                    break;

                case 'openLink':
                    if (message.link) {
                        vscode.window.showInformationMessage("Abriendo Link");
                        vscode.env.openExternal(vscode.Uri.parse(message.link));
                    }
                    break;

                case 'showMessage':
                    vscode.window.showInformationMessage(message.message);
                    break;

                case 'sandboxCreate':
                    const createWorkspaceRes = await vscode.window.showInformationMessage(
                        '¿Desplegar un nuevo Workspace en Tambo Sandbox?',
                        { modal: true },
                        'Sí'
                    );

                    if (createWorkspaceRes === 'Sí') {

                        const sandbox = new Sandbox();
                        const response = await sandbox.createWorkspace();
                        if (response) {
                            vscode.window.showInformationMessage("TAMBO: Se inicio la creacion del workspace en Sandbox");
                        } else {
                            vscode.window.showErrorMessage("TAMBO: Ha ocurrido un error al intentar iniciar el workspace en Sandbox");
                        }

                    }
                    break;

                case 'sandboxDestroy':

                    const destroyWorkspaceRes = await vscode.window.showInformationMessage(
                        '¿Destruir el workspace actualmente en ejecuccion?',
                        { modal: true }, // Modal para enfatizar la confirmación
                        'Sí'
                    );

                    if (destroyWorkspaceRes === 'Sí') {
                        const sandbox = new Sandbox();
                        const response = await sandbox.destroyWorkspace();
                        if (response) {
                            vscode.window.showInformationMessage("TAMBO: Destruyendo workspace en Sandbox");
                        } else {
                            vscode.window.showErrorMessage("TAMBO: Ha ocurrido un error intentando destruir el workspace en Sandbox");
                        }
                    }
                    break;

                case 'sandboxChangeGroup':
                    globalConfig.workspaceRepository = {
                        name: message.data.name,
                        path: message.data.path,
                        repoid: message.data.repoid,
                        commit: message.data.commit
                    };
                    vscode.window.showInformationMessage(`TAMBO COMMIT: ${message.data.commit}`);
                    break;

            }

        });
    }

    refreshView(): void {

        if (this.webviewView) {
            this.updateWebviewContent();
        } else {
            console.error("TAMBOSANDBOX.connectionViewProvider.refreshview: No se puede refrescar, el WebView no está inicializado.");
        }

    }

    private updateWebviewContent(): void {

        if (!this.webviewView) {
            return;
        }

        const connection = new Connection();
        globalConfig.vscodeUri = this.webviewView.webview.asWebviewUri(this.context.extensionUri);

        if (connection.isConfigured()) {
            this.webviewView.webview.html = this.getConnectionContent(
                this.webviewView.webview.asWebviewUri(this.context.extensionUri)
            );
        } else {
            this.webviewView.webview.html = this.getConnectionWizardContent(
                this.webviewView.webview.asWebviewUri(this.context.extensionUri)
            );
        }

    }

    private getConnectionWizardContent(vscodeURI: vscode.Uri): string {

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Bienvenido a Tambo Sandbox</title>
                <style>
                    body {
                        line-height: 1.6;
                    }
                    a {
                        color: #FFFFFFCC;
                        text-decoration: none;
                        
                    }
                    a:hover {
                        text-decoration: underline;
                    }
                    .wizard-button {
                        width: 100%;
                        padding: 15px 0;
                        border-radius: 5px;
                        font-size: 14px;
                       
                        color: orange;
                        background-color: transparent;
                        border: 1px solid orange;
                        text-align: center;
                        cursor: pointer;
                        transition: background-color 0.3s, color 0.3s;
                    }
                    .wizard-button:hover {
                        background-color: orange;
                        color: black;
                    }
                </style>
            </head>
            <body>
                <b>¡BIENVENIDO A TAMBO SANDBOX!</b>
                <p>Parece que aún no has configurado tu conexión al Sandbox.
                <p>Para comenzar deberás primero registrar una nueva conexión. Puedes hacerlo utilizando nuestro asistente de configuración.
                <p><button onclick="invokeWizard()" class="wizard-button">Asistente de Conexión</button>
                <p>El asistente te guiará paso a paso en el proceso de registro.
                <p>Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos a través de nuestro correo <a href="mailto:frameautomation@teco.com.ar">frameautomation@teco.com.ar</a>
            </body>
                <script>
                    const vscode = acquireVsCodeApi();
                    function invokeWizard() {
                        vscode.postMessage({ command: "sandboxWizard" });
                    }
                </script>
            </html>
        `;

    }

    private getConnectionContent(vscodeURI: vscode.Uri): string {

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Connections View</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 10px;
                    }
                    .row {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 10px;
                    }
                    .status {
                        display: flex;
                        align-items: center;
                    }
                    .status span {
                        display: inline-block;
                        width: 10px;
                        height: 10px;
                        border-radius: 50%;
                        margin-right: 8px;
                        margin-top: -5px;
                        margin-left: 5px;
                    }
                    .status .online {
                        background-color: green;
                    }
                    .status .offline {
                        background-color: red;
                    }
                    .status .deploying {
                        background-color: orange;
                    }
                    .status .destroying {
                        background-color: yellow;
                    }
                    .status .unknown {
                        background-color: blue;
                    }
                    .status-msg {
                        display: flex;
                        align-items: flex-start;"
                    }
                    .arrow {
                        align-self: flex-start;
                        font-size: 16px;
                        margin-right: 5px;
                        padding-left: 7px;
                    }
                    .icon {
                        height: 100%;
                        padding-right: 7px;
                    }
                    .msg {
                        width: 100%;
                        height: 100%;
                        padding-top: 2px;
                        color: #FFD740;
                    }
                    .sandbox-button {
                        position: relative;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        padding: 10px 20px;
                        font-size: 12px;
                        font-wight: 900;
                        color: white;
                        background-color: transparent;
                        border: 2px solid orange;
                        border-radius: 5px;
                        cursor: pointer;
                        transition: background-color 0.3s;
                        width: 100%;
                        color: orange;
                        margin-top: 10px;
                        margin-left: 10px;
                        margin-right: 10px;
                    }
                    .sandbox-button:hover {
                        background-color: orange;
                        color: black;
                    }
                    .sandbox-button:disabled {
                        background-color: transparent;
                        cursor: not-allowed;
                    }
                    .spinner {
                        position: absolute;
                        width: 16px;
                        height: 16px;
                        border: 2px solid orange;
                        border-top-color: transparent;
                        border-radius: 50%;
                        animation: spin 0.6s linear infinite;
                        display: none;
                    }
                    .sandbox-button.loading .spinner {
                        display: block; /* Mostrar spinner cuando esta cargando */
                    }

                    .sandbox-button.loading span {
                        visibility: hidden; /* Ocultar Texto cuando el spinner esta visible */
                    }

                    @keyframes spin {
                        from {
                            transform: rotate(0deg);
                        }
                        to {
                            transform: rotate(360deg);
                        }
                    }
                    .apps-button {
                        display: flex; /* Flexbox para alinear contenido horizontalmente */
                        align-items: center; /* Centrar verticalmente */
                        width: 100%;
                        padding: 10px 0px 10px 0px;
                        margin: -7px 10px 0px 10px;
                        border-radius: 5px;
                        font-size: 12px;
                        color: #eee;
                        background-color: rgba(0, 0, 0, 0.1);
                        border: 1px solid rgba(0, 0, 0, 0.1);
                        text-align: center;
                        cursor: pointer;
                        transition: background-color 0.3s, color 0.3s;
                    }
                    .apps-button:hover {
                        background-color: orange;
                        color: #eee;
                        font-weight: bold;
                    }
                    .apps-button-icon {
                        width: 16px; /* Ajusta el tamaño del ícono */
                        height: 16px;
                        margin-right: 8px; /* Espacio entre el ícono y el texto */
                        margin-left: 10px;
                    }
                    .app-button-selected {
                        border: 1px solid white;
                    }
                    .external-link-icon {
                        width: 10px; 
                        height: 10px;
                        padding-left: 8px;
                    }
                    .hidden {
                        display: none;
                    }
                    .tools-buttons {
                        display: flex;
                        flex-wrap: wrap;
                        justify-content: flex-start;
                        gap: 10px;
                    }
                    .select-container {
                        position: relative;
                        width: 100%;
                        max-width: 600px;
                    }
                    .custom-select {
                        width: 100%;
                        background-color: #202233;
                        border: 1px solid #444; 
                        border-radius: 5px; 
                        padding: 10px 15px;
                        font-size: 13px;
                        color: #FFFFFF;
                        cursor: pointer;
                        appearance: none;
                        -webkit-appearance: none; 
                        -moz-appearance: none;
                    }
                    .custom-select:focus {
                        outline: none;
                        border-color: white; 
                    }
                    .custom-select option {
                        background-color: #1E1E2F; 
                        color: #FFFFFF;
                        padding: 10px;
                    }
                    .custom-select option:hover {
                        background-color: #4CAF50;
                        color: #FFFFFF;
                    }
                    .custom-select-arrow {
                        position: absolute;
                        right: 15px;
                        top: 50%;
                        transform: translateY(-50%);
                        pointer-events: none;
                        width: 0;
                        height: 0;
                        border-left: 6px solid transparent;
                        border-right: 6px solid transparent;
                        border-top: 6px solid #FFFFFF;
                    }               

                    </style>
            </head>
            <body>

                <div id="sandboxPanelStatus"></div>

                <script>
                    const vscode = acquireVsCodeApi();

                    window.addEventListener('message', (event) => {
                        const message = event.data;
                        if (message.command === 'sandboxConnectionStatus') {

                            const sPanelStatus = document.getElementById('sandboxPanelStatus');
                            sPanelStatus.innerHTML = message.data;

                            const buttons = sPanelStatus.querySelectorAll('.apps-button[data-link]');
                            buttons.forEach(button => {
                                button.addEventListener('click', (event) => {
                                    const link = button.getAttribute('data-link');
                                    if (link) {
                                        vscode.postMessage({ command: 'openLink', link });
                                    }
                                });
                            });

                        }
                    });

                    function createSandbox() {
                        vscode.postMessage({ command: 'sandboxCreate' });
                    }

                    function destroySandbox() {
                        vscode.postMessage({ command: 'sandboxDestroy' });
                    }

                    function updateSandboxData() {
                        vscode.postMessage({ command: 'sandboxStatus' });
                    }

                    function sandboxChangeGroup(event, commit) {
                        const selectedOption = event.target.options[event.target.selectedIndex];
                        vscode.postMessage({ 
                            command: 'sandboxChangeGroup', 
                            data: { 
                                name: selectedOption.dataset.name,
                                path: selectedOption.value, 
                                repoid: selectedOption.dataset.repoid,
                                commit: commit
                            } 
                        });
                    }

                    //updateSandboxData();
                    setInterval(updateSandboxData, 3000);

                </script>
            </body>
            </html>
        `;

    }
}


async function updateStatus(vscodeURI: vscode.Uri) {

    const sandbox = new Sandbox();
    const gitlab = new Gitlab();
    const [sandboxStatus, gitStatus] = await Promise.all([sandbox.status(), gitlab.status()]);

    let workspaceStatus: { estado: number; clase: string; texto: string; warningMessage?: string } = { estado: 1, clase: 'offline', texto: 'Desconectado' };
    let actionButtonHTML = '';

    if (sandboxStatus && gitStatus) {

        const sandbox = new Sandbox();
        const workspaceEffectiveStatus = await sandbox.workspaceStatus();

        switch (workspaceEffectiveStatus) {
            case 0:
                workspaceStatus = { estado: 0, clase: 'online', texto: 'Conectado' };
                globalConfig.workspaceRepositories = await sandbox.respositories();
                const workspaceToolsHTML = await htmlTools();
                await sandbox.workspaceUpdateCurrentGroup();
                const workspaceChangeReposHTML = await htmlRepos(globalConfig.workspaceRepositories, true);
                actionButtonHTML = `
                    ${workspaceChangeReposHTML}
                    ${workspaceToolsHTML}
                    <div class="row" style="padding-top: 10px;">
                        <button id="actionSandboxButton" onclick="destroySandbox();" class="sandbox-button">
                            <div class="spinner"></div>
                            <span id="actionSandboxButtonText">DESTRUIR WORKSPACE</span>
                        </button>
                    </div>
                    </hr>
                `;
                break;
            case 1:
                globalConfig.workspaceRepositories = await sandbox.respositories();
                const workspaceReposHTML = await htmlRepos(globalConfig.workspaceRepositories, false);
                workspaceStatus = { estado: 1, clase: 'offline', texto: 'Desconectado', warningMessage: 'No tienes un workspace asignado. Para iniciar uno nuevo, haz clic en el botón <b>Iniciar workspace</b> para comenzar.' };
                actionButtonHTML = `
                    ${workspaceReposHTML}
                    <div class="row" style="padding-top: 10px;">
                        <button id="actionSandboxButton" onclick="createSandbox();" class="sandbox-button">
                            <div class="spinner"></div>
                            <span id="actionSandboxButtonText">INICIAR WORKSPACE</span>
                        </button>
                    </div>
                `;
                break;
            case 2:
                workspaceStatus = { estado: 2, clase: 'deploying', texto: 'Deployando', warningMessage: 'Se está deployando su espacio de trabajo, esto puede demorar aproximadamente 3 minutos.' };
                break;
            case 3:
                workspaceStatus = { estado: 3, clase: 'deploying', texto: 'Deployando', warningMessage: 'Se está deployando su espacio de trabajo, esto puede demorar aproximadamente 3 minutos.' };
                break;
        }
    }

    let html1 = '';

    html1 += createStatusHTML1("Sandbox", sandboxStatus ? "Conectado" : "Desconectado", sandboxStatus ? 'online' : 'offline', sandboxStatus ? "" : "No se pudo establecer conexión con el servicio de Sandbox. Verifique sus credenciales o conexión a la red asegúrandose de estar conectado a la VPN Corporativa.");
    html1 += createStatusHTML1("Git", gitStatus ? "Conectado" : "Desconectado", gitStatus ? 'online' : 'offline', gitStatus ? "" : "Autenticación fallida. Por favor, verifique que su usuario y token sean correctos.");
    html1 += createStatusHTML1("Workspace", workspaceStatus.texto, workspaceStatus.clase, workspaceStatus.warningMessage);
    html1 += actionButtonHTML;

    function createStatusHTML1(
        title: string,
        status: any,
        clase: string,
        warningMessage?: string
    ) {

        let additionalMessage = "";
        if (warningMessage) {
            additionalMessage = `<div class="row">
                                <div class="status-msg">
                                    <span class="arrow">&#x21B3;</span>
                                    <span class="icon">⚠️</span>
                                    <span class="msg">${warningMessage}</span>
                                </div>
                            </div>`;
        }

        return `
            <div class="row">
                <div class="status">
                    <span class="${clase}"></span>
                    <b>${title}: </b>
                    <span>${status}</span>
                </div>
            </div>
            ${additionalMessage}
        `;
    }

    return html1;

}

async function htmlRepos(repositoriesList: any, commit: boolean, selectedGroup: string = ""): Promise<string> {

    if (!Array.isArray(repositoriesList) || repositoriesList.length === 0) {
        return `
            <div class="row" style="padding: 5px 0px 0px 10px;">
                <b>No se encontraron grupos disponibles</b>
            </div>
        `;
    }

    const groups = repositoriesList
        .map((repo: { id: number; path: string }) => {
            const match = repo.path.match(/clientes\/(.*?)\/tambo/);
            return match
                ? {
                    grupo: match[1].toUpperCase(),
                    path: repo.path,
                    id: repo.id
                }
                : null;
        })
        .filter((item): item is { name: string; grupo: string; path: string; id: number } => item !== null);

    if (groups.length === 0) {
        return `
            <div class="row" style="padding: 5px 0px 0px 10px;">
                <b>No se encontraron grupos válidos</b>
            </div>
        `;
    }

    const optionsHtml = groups
        .map(({ grupo, path, id }) =>
            `<option value="${path}" data-name="${grupo}" data-repoid="${id}" 
        ${globalConfig.workspaceRepository?.name.toUpperCase() === grupo ? 'selected' : ''}>
        ${grupo}
        </option>`
        )
        .join("\n");

    return `
        <div class="row" style="padding: 20px 0px 0px 10px;">
            <b>Grupos:</b>
        </div>
        <div class="row" style="padding: 5px 10px 5px 10px;">
            <div class="select-container">
                <select class="custom-select" onchange="sandboxChangeGroup(event, ${commit});">
                    ${optionsHtml}
                </select>
                <div class="custom-select-arrow"></div>
            </div>
        </div>
    `;

}

async function htmlTools(): Promise<string> {

    const vscodeURI = globalConfig.vscodeUri;
    const configuration = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
    const currentUsername = configuration.get('username');

    const html = `
        <div class="row" style="padding: 10px 0px 10px 10px;">
            <b>Herramientas:</b>
        </div>
        <div class="row">
            <button class="apps-button" data-link="https://airflow-sandbox-${currentUsername}.dev.apps.automation.teco.com.ar/airflow/home">
                <img src="${vscodeURI}/resources/logos/airflow.png" class="apps-button-icon"> AIRFLOW <img src="${vscodeURI}/resources/icons/external-link.svg" class="external-link-icon" />
            </button>
        </div>
        <div class="row">
            <button class="apps-button" data-link="https://gitlab.com/groups/telecom-argentina/-/saml/sso?token=93NxX_B5">
                <img src="${vscodeURI}/resources/logos/gitlab.png" class="apps-button-icon"> GITLAB <img src="${vscodeURI}/resources/icons/external-link.svg" class="external-link-icon" />
            </button>
        </div>
        <div class="row">
            <button class="apps-button" data-link="https://automation.telecom.com.ar">
                <img src="${vscodeURI}/resources/logos/automation.svg" class="apps-button-icon"> PORTAL AUTOMATIZACION <img src="${vscodeURI}/resources/icons/external-link.svg" class="external-link-icon" />
            </button>
        </div>
    `;

    return html;

}

async function htmlCloneRepository(): Promise<string> {

    const html = `
        <div class="row" style="padding-top: 10px;">
            <button id="actionSandboxButton" onclick="cloneRepository();" class="sandbox-button">
                <div class="spinner"></div>
                <span id="actionSandboxButtonText">CLONAR REPOSITORIO</span>
            </button>
        </div>
    `;

    return html;

}
