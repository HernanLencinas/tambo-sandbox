/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { encrypt } from './utils';
//import * as https from 'https';
//import axios from 'axios';
//import { globalConfig } from './globals';
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
                        { modal: true }, // Modal para enfatizar la confirmación
                        'Sí'
                    );

                    if (createWorkspaceRes === 'Sí') {

                        const sandbox = new Sandbox();
                        await sandbox.createWorkspace();
                        vscode.window.showInformationMessage("Creando sandbox");

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
                        await sandbox.destroyWorkspace();
                        vscode.window.showInformationMessage("Destruyendo Workspace de Sandbox");
                    }

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

                    //updateSandboxData();
                    setInterval(updateSandboxData, 3000);

                </script>
            </body>
            </html>
        `;

    }
}

async function checkGitlab(): Promise<boolean> {

    try {

        const config = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
        const username = config.get<string>('username');
        const gitlab = new Gitlab();
        const response = await gitlab.status();

        return response?.status === 200 && response.data.username === username;

    } catch (error) {

        console.error("TAMBOSANDBOX.connections.checkGitlab", error);
        return false;

    }

}

async function checkWorkspace(): Promise<any> {

    try {

        const sandbox = new Sandbox();
        const response = await sandbox.statusWorkspace();

        if (response.status === 200) {
            return response;
        } else {
            return false;
        }

    } catch (error) {

        console.error("TAMBOSANDBOX.connections.checkWorkspace", error);
        return false;

    }

}

async function updateStatus(vscodeURI: any): Promise<any> {

    const [workspaceStatus, gitStatus] = await Promise.all([checkWorkspace(), checkGitlab()]);
    const sandboxStatus = !!workspaceStatus;

    const estadoMap = {
        0: { clase: 'online', texto: 'Conectado' },
        1: { clase: 'offline', texto: 'Desconectado' },
        2: { clase: 'deploying', texto: 'Deployando' },
        3: { clase: 'deploying', texto: 'Deployando' },
    };

    const errorMessages = {
        sandbox: "No se pudo establecer conexión con el servicio de Sandbox. Verifique sus credenciales o conexión a la red asegúrandose de estar conectado a la VPN Corporativa.",
        git: "Autenticación fallida. Por favor, verifique que su usuario y token sean correctos.",
        workspace: "No tienes un workspace asignado. Para crear uno nuevo, haz clic en el botón <b>Iniciar workspace</b> para comenzar.",
    };

    const originalWorkspaceStatus = workspaceStatus.data?.estado as keyof typeof estadoMap;

    let workspaceEffectiveStatus = originalWorkspaceStatus;
    if (!sandboxStatus && !gitStatus) {
        workspaceEffectiveStatus = 1;
    }

    const estadoInfo = estadoMap[workspaceEffectiveStatus] || { clase: 'offline', texto: 'Desconectado' };

    function createStatusHTML(title: string, status: any, isCustom = false, errorKey: 'sandbox' | 'git' | 'workspace' = 'sandbox', showOriginalError = false) {

        const clase = isCustom ? status.clase : status ? 'online' : 'offline';
        const texto = isCustom ? status.texto : status ? 'Conectado' : 'Desconectado';
        let showError = clase === 'offline' && errorKey && (!showOriginalError || originalWorkspaceStatus === 1);

        let additionalMessage = "";
        if (isCustom && workspaceEffectiveStatus === 2 && errorKey === 'workspace') { // Estado "deploying" solo para workspace
            additionalMessage = `<div class="row">
                                    <div class="status-msg">
                                        <span class="arrow">&#x21B3;</span>
                                        <span class="icon">⚠️</span>
                                        <span class="msg">Se esta deployando su espacio de trabajo, esto puede demorar aproximadamente 5 minutos.</span>
                                    </div>
                                </div>`;
        }

        const errorSection = showError
            ? `
                <div class="row">
                    <div class="status-msg">
                        <span class="arrow">&#x21B3;</span>
                        <span class="icon">⚠️</span>
                        <span class="msg">${errorMessages[errorKey]}</span>
                    </div>
                </div>
            `
            : '';

        return `
            <div class="row">
                <div class="status">
                    <span class="${clase}"></span>
                    <b>${title}: </b>
                    <span>${texto}</span>
                </div>
            </div>
            ${errorSection}
            ${additionalMessage}
        `;
    }

    const htmlStatusSandbox = createStatusHTML('Sandbox', sandboxStatus, false, 'sandbox');
    const htmlStatusGit = createStatusHTML('Git', gitStatus, false, 'git');
    const htmlStatusWorkspace = createStatusHTML('Workspace', estadoInfo, true, 'workspace', true);

    let actionButtonHTML = '';

    if (sandboxStatus) {
        if (workspaceEffectiveStatus === 0) {
            const toolsHTML = await updateTools();
            const gruposHTML = await updateRepository(workspaceStatus);
            actionButtonHTML = `
            <div class="row">
                <button id="actionSandboxButton" onclick="destroySandbox();" class="sandbox-button">
                    <div class="spinner"></div>
                    <span id="actionSandboxButtonText">DESTRUIR WORKSPACE</span>
                </button>
            </div>
            ${toolsHTML}
            ${gruposHTML}
        `;
        } else if (workspaceEffectiveStatus === 1) {
            actionButtonHTML = `
            <div class="row">
                <button id="actionSandboxButton" onclick="createSandbox();" class="sandbox-button">
                    <div class="spinner"></div>
                    <span id="actionSandboxButtonText">CREAR WORKSPACE</span>
                </button>
            </div>
            `;
        }
    }

    return htmlStatusSandbox + htmlStatusGit + htmlStatusWorkspace + actionButtonHTML;
}

async function updateRepository(workspaceStatus: any): Promise<string> {
    let html = `
        <div class="row" style="padding: 10px 0px 10px 10px;">
            <b>Grupos:</b>
        </div>
    `;

    // Extraer y ordenar los grupos alfabéticamente
    const sortedGroups = workspaceStatus.data.repos_disponibles
        .map((repo: any) => {
            const match = repo.path.match(/clientes\/(.*?)\/tambo/);
            return match ? match[1] : null; // Extraer el grupo
        })
        .filter((grupo: string | null) => grupo !== null) // Filtrar valores null
        .sort((a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase())); // Ordenar alfabéticamente ignorando mayúsculas

    // Generar el HTML con los grupos ordenados
    sortedGroups.forEach((grupo: string) => {
        const vscodeURI = globalConfig.vscodeUri;

        html += `
            <div class="row">
                <button class="apps-button">
                    <img src="${vscodeURI}/resources/icons/git_dark.svg" class="apps-button-icon">${grupo.toUpperCase()}
                </button>
            </div>
        `;
    });

    return html;
}

async function updateTools(): Promise<string> {

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

