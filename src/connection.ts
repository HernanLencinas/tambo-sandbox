/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { encrypt, decrypt } from './utils';
import * as https from 'https';
import axios from 'axios';
import { globalConfig } from './globals';
import { Sandbox } from './sandbox';
import { Gitlab } from './gitlab';

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
            console.error("TAMBOSANDBOX: ", error);
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
            console.error("TAMBOSANDBOX: No se pudo actualizar la vista.");
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
                    const apiStatus = await checkApi();
                    const gitStatus = await checkGitlab();
                    const workspaceStatus = apiStatus && gitStatus;

                    const sandboxData = [
                        { 'api': apiStatus },
                        { 'git': gitStatus },
                        { 'workspace': false }
                    ];

                    webviewView.webview.postMessage({ command: 'sandboxData', data: sandboxData });
                    break;

                case 'sandboxWizard':
                    vscode.commands.executeCommand('tambosandbox.connectionWizard');
                    break;

                case 'startWorkspace':

                    const respuesta = await vscode.window.showInformationMessage(
                        '¿Iniciar un nuevo workspace de TAMBO Sandbox?',
                        { modal: true }, // Modal para enfatizar la confirmación
                        'Sí'
                    );

                    if (respuesta === 'Sí') {
                        vscode.window.showInformationMessage("TAMBO-SANDBOX: Iniciando Workspace de Sandbox");
                    }
                    break;

                case 'openLink':
                    if (message.link) {
                        vscode.env.openExternal(vscode.Uri.parse(message.link));
                    }
                    break;

                case 'showMessage':
                    vscode.window.showInformationMessage(message.message);
                    break;
            }
        });
    }

    refreshView(): void {

        if (this.webviewView) {
            this.updateWebviewContent();
        } else {
            console.error("TAMBOSANDBOX: No se puede refrescar, el WebView no está inicializado.");
        }

    }

    private updateWebviewContent(): void {

        if (!this.webviewView) {
            return;
        }

        const connection = new Connection();
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
                    button {
                        background-color: transparent;
                        color: #0e639c;
                        border: 1px solid #0e639c;
                        padding: 3px 10px;
                        border-radius: 3px;
                        font-size: 12px;
                        cursor: pointer;
                        transition: all 0.3s;
                    }
                    button:hover {
                        background-color: #0e639c;
                        color: #ffffff;
                    }
                    .sandbox-button {
                        width: 100%;
                        padding: 10px 0px 10px 0px;
                        margin: 10px 10px 0px 10px;
                        border-radius: 5px;
                        font-size: 12px;
                        color: orange;
                        background-color: transparent;
                        border: 1px solid orange;
                        text-align: center;
                        cursor: pointer;
                        transition: background-color 0.3s, color 0.3s;
                    }
                    .sandbox-button:hover {
                        background-color: orange;
                        color: black;
                    }

                    .apps-button {
                        display: flex; /* Flexbox para alinear contenido horizontalmente */
                        align-items: center; /* Centrar verticalmente */
                        width: 100%;
                        padding: 10px 0px 10px 0px;
                        margin: -7px 10px 0px 10px;
                        border-radius: 5px;
                        font-size: 12px;
                        color: orange;
                        /* background-color: red; */
                        background-color: transparent;
                        border: 1px solid orange;
                        text-align: center;
                        cursor: pointer;
                        transition: background-color 0.3s, color 0.3s;
                    }
                    .apps-button:hover {
                        background-color: orange;
                        color: black;
                    }
                    .apps-button-icon {
                        width: 16px; /* Ajusta el tamaño del ícono */
                        height: 16px;
                        margin-right: 8px; /* Espacio entre el ícono y el texto */
                        margin-left: 10px;
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
                <div class="row">
                    <div class="status">
                        <span id="statusConnection" class="offline"></span>
                        <b>Sandbox: </b><span id="statusConnectionText">Desconectado</span>
                    </div>
                </div>

                <div class="row">
                    <div class="status">
                        <span id="statusGit" class="offline"></span>
                        <b>Git: </b><span id="statusGitText">Desconectado</span>
                    </div>
                </div>


                <div class="row">
                    <div class="status">
                        <span id="statusWorkspace" class="offline"></span>
                        <b>Workspace: </b><span id="statusWorkspaceText">Inactivo</span>
                    </div>
                    <button id="connectButton" class="hidden">Crear</button>
                </div>

                <div class="row">
                    <button id="startSandboxButton" onclick="invokeStartWorkspace();" class="sandbox-button hidden">Iniciar Workspace</button>
                </div>

                <div class="row" style="padding: 10px 0px 10px 10px;">
                    <b>Accesos:</b>
                </div>


                <div class="row">
                    <button class="apps-button" data-link="https://tambo-playground.automation.teco.com.ar">
                        <img src="${vscodeURI}/resources/logos/airflow.png" class="apps-button-icon"> Airflow
                    </button>
                </div>

                <div class="row">
                    <button class="apps-button" data-link="https://gitlab.com/groups/telecom-argentina/-/saml/sso?token=93NxX_B5">
                        <img src="${vscodeURI}/resources/logos/gitlab.png" class="apps-button-icon"> Gitlab
                    </button>
                </div>

                <div class="row">
                    <button class="apps-button" data-link="https://automation.telecom.com.ar">
                        <img src="${vscodeURI}/resources/logos/automation.svg" class="apps-button-icon"> Automatizacion
                    </button>
                </div>                
                
                <script>
                    const vscode = acquireVsCodeApi();

                    document.addEventListener('DOMContentLoaded', () => {
                            // Selecciona todos los botones con data-link
                        const buttons = document.querySelectorAll('.apps-button[data-link]');

                        buttons.forEach(button => {
                            button.addEventListener('click', (event) => {
                                const link = button.getAttribute('data-link');
                                if (link) {
                                    vscode.postMessage({ command: 'openLink', link });
                                }
                            });
                        });
                    });

                    window.addEventListener('message', (event) => {

                        const message = event.data;

                        if (message.command === 'sandboxData') {

                            //console.log("TAMBOSANDBOX: ", message);

                            const apiEntry = message.data.find(entry => entry.hasOwnProperty('api'));
                            const gitEntry = message.data.find(entry => entry.hasOwnProperty('git'));
                            const workspaceEntry = message.data.find(entry => entry.hasOwnProperty('workspace'));

                            const statusConnection = document.getElementById('statusConnection');
                            const statusConnectionText = document.getElementById('statusConnectionText');

                            if (apiEntry['api']) {
                                statusConnection.className = 'online';
                                statusConnectionText.textContent = 'Conectado';
                            } else {
                                statusConnection.className = 'offline';
                                statusConnectionText.textContent = 'Desconectado';
                            }
                            
                            const statusGit = document.getElementById('statusGit');
                            const statusGitText = document.getElementById('statusGitText');

                            if (gitEntry['git']) {
                                statusGit.className = 'online';
                                statusGitText.textContent = 'Conectado';
                            } else {
                                statusGit.className = 'offline';
                                statusGitText.textContent = 'Desconectado';
                            }

                            const statusWorkspace = document.getElementById('statusWorkspace');
                            const statusWorkspaceText = document.getElementById('statusWorkspaceText');
                            const statusWorkspaceButton = document.getElementById('startSandboxButton');

                            if (workspaceEntry['workspace']) {
                                statusWorkspace.className = 'online';
                                statusWorkspaceText.textContent = 'Iniciado';
                                statusWorkspaceButton.classList.add('hidden');
                            } else {
                                statusWorkspace.className = 'offline';
                                statusWorkspaceText.textContent = 'Inactivo';
                                statusWorkspaceButton.classList.remove('hidden');
                            }

                        }

                    });

                    function invokeStartWorkspace() {
                        //document.getElementById('startSandboxButton').classList.add('hidden');
                        vscode.postMessage({ command: "startWorkspace" });
                    }

                    function updateSandboxData() {
                        vscode.postMessage({ command: 'sandboxStatus' });
                    }

                    updateSandboxData();
                    setInterval(updateSandboxData, 3000);
                </script>
            </body>
            </html>
        `;

    }
}

async function checkApi(): Promise<boolean> {

    try {

        const sandbox = new Sandbox();
        const response = await sandbox.status();

        return response?.status === 200;

    } catch (error) {

        console.error("TAMBOSANDBOX:", error);
        return false;

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

        console.error("TAMBOSANDBOX:", error);
        return false;

    }

}