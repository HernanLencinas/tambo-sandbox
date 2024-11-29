/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { encrypt, decrypt } from './utils';
import * as https from 'https';
import axios from 'axios';

export class Connection {

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
            vscode.window.showInformationMessage(`TAMBO: Se configuró la conexión con TAMBO Sandbox`);
        }
    }

    load(context: vscode.ExtensionContext) {
        try {
            const provider = new ConnectionsViewProvider(context);
            context.subscriptions.push(
                vscode.window.registerWebviewViewProvider(ConnectionsViewProvider.viewType, provider)
            );
        } catch (error) {
            console.error("Tambo: ", error);
        }
    }

}

class ConnectionsViewProvider implements vscode.WebviewViewProvider {
    static viewType = 'tambo_viewport_connection';
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext<unknown>,
        token: vscode.CancellationToken
    ): void | Thenable<void> {
        webviewView.webview.options = {
            enableScripts: true,
        };

        webviewView.webview.html = this.getWebviewContent(webviewView.webview.asWebviewUri(this.context.extensionUri));

        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'sandboxStatus':

                    const apiStatus = await checkApi();
                    const gitStatus = await checkGitlab();
                    const workspaceStatus = apiStatus === true && gitStatus === true;

                    const sandboxData = [
                        { 'api': apiStatus },
                        { 'git': gitStatus },
                        { 'workspace': workspaceStatus }
                    ];

                    webviewView.webview.postMessage({ command: 'sandboxData', data: sandboxData });

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

    private getWebviewContent(vscodeURI: vscode.Uri): string {
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
                .hidden {
                    display: none;
                }

                .tools-buttons {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: flex-start;
                    gap: 10px;
                }

                .tool-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: 70px;
                    height: 60px;
                    border: 1px solid #0e639c;
                    border-radius: 3px;
                    text-align: center;
                    font-size: 10px;
                    color: #0e639c;
                    cursor: pointer;
                    transition: all 0.3s;
                    background-color: transparent;
                }

                .tool-btn:hover {
                    background-color: #0e639c;
                    color: #ffffff;
                }

                .tool-btn .icon {
                    width: 24px;
                    height: 24px;
                    margin-bottom: 5px;
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

            <div>
                <!--
                <div class="row" style="padding-top:10px;">
                    <div class="status">
                        <b>Herramientas: </b>
                    </div>
                </div>
                -->
                
                <div class="row tools-buttons">
                    <button class="tool-btn" data-link="https://automation.telecom.com.ar">
                        <img src="${vscodeURI}/resources/logos/automation.svg" class="icon">
                        <span>Automation</span>
                    </button>
                    <button class="tool-btn" data-link="https://tambo-playground.automation.teco.com.ar">
                        <img src="${vscodeURI}/resources/logos/airflow.png" class="icon">
                        <span>Airflow</span>
                    </button>
                    <button class="tool-btn" data-link="https://gitlab.com/groups/telecom-argentina/-/saml/sso?token=93NxX_B5">
                        <img src="${vscodeURI}/resources/logos/gitlab.png" class="icon">
                        <span>GitLab</span>
                    </button>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();

                document.addEventListener('DOMContentLoaded', () => {
                        // Selecciona todos los botones con data-link
                    const buttons = document.querySelectorAll('.tool-btn[data-link]');

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

                        console.log(message);

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

                        if (workspaceEntry['workspace']) {
                            statusWorkspace.className = 'online';
                            statusWorkspaceText.textContent = 'Iniciado';
                        } else {
                            statusWorkspace.className = 'offline';
                            statusWorkspaceText.textContent = 'Inactivo';
                        }

                    }

                });

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
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false, // Ignorar certificados autofirmados
        });

        const response = await axios.get('https://cloudvalley.telecom.com.ar/api/ping', { httpsAgent });
        return response.status === 200;

    } catch (error) {
        console.log(error);
        return false;
    }

}

async function checkGitlab(): Promise<boolean> {

    try {
        const configuration = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
        const username = configuration.get<string>('username');
        const encryptedToken = configuration.get<string>('token');
        const token = encryptedToken ? decrypt(encryptedToken) : null;

        if (!username || !token) {
            console.log('TAMBOSANDBOX: Gitlab: No hay credenciales configuradas.');
            return false;
        }

        const httpsAgent = new https.Agent({
            rejectUnauthorized: false, // Ignorar certificados autofirmados
        });

        const response = await axios.get('https://gitlab.com/api/v4/user', { 
            httpsAgent, 
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.status === 200 && response.data.username === username;
        
    } catch (error) {
        console.log(error);
        return false;
    }

}
