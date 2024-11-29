/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { encrypt, decrypt } from './utils';
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

    /*     async apiPing() {
            try {
                const response = await axios.get('https://cloudvalley.telecom.com.ar/api/ping');
                if (response.status === 200) {
                    console.log(`TAMBOSANDBOX: apiPing OK`);
                } else {
                    console.log(`TAMBOSANDBOX: apiPing FAIL`);
                }
            } catch (error) {
                console.log(`TAMBOSANDBOX: apiPing ERROR ${error}`);
            }
        } */
/* 
    async gitPing() {
        try {
            const configuration = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
            const username = configuration.get<string>('username');
            const encryptedToken = configuration.get<string>('token');
            const token = encryptedToken ? decrypt(encryptedToken) : null;

            if (!username || !token) {
                console.log('TAMBOSANDBOX: Gitlab: No hay credenciales configuradas.');
                return;
            }

            const response = await axios.get('https://gitlab.com/api/v4/user', {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.status === 200 && response.data.username === username) {
                console.log('TAMBOSANDBOX: Gitlab: ping exitoso.');
            } else {
                console.log('TAMBOSANDBOX: Gitlab: autenticacion fallida.');
            }
        } catch (error) {
            console.log(`TAMBOSANDBOX: gitPing ${error}`);
        }
    } */

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

        webviewView.webview.html = this.getWebviewContent();

        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'checkApiStatus':
                    try {
                        const response = await axios.get('https://cloudvalley.telecom.com.ar/api/ping');
                        if (response.status === 200) {
                            webviewView.webview.postMessage({ command: 'updateStatus', status: 'online' });
                        } else {
                            webviewView.webview.postMessage({ command: 'updateStatus', status: 'offline' });
                        }
                    } catch (error) {
                        webviewView.webview.postMessage({ command: 'updateStatus', status: 'offline' });
                    }
                    break;

                case 'checkGitlabStatus':
                    /*                     try {
                                            const connection = new Connection();
                                            const response = await connection.gitPing();
                                            console.log(response);
                    
                                        } catch (error) {
                                            vscode.window.showErrorMessage('Error conectando con gitlab');
                                        } */
                    try {
                        const configuration = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
                        const username = configuration.get<string>('username');
                        const encryptedToken = configuration.get<string>('token');
                        const token = encryptedToken ? decrypt(encryptedToken) : null;

                        if (!username || !token) {
                            console.log('TAMBOSANDBOX: Gitlab: No hay credenciales configuradas.');
                            return;
                        }

                        const response = await axios.get('https://gitlab.com/api/v4/user', {
                            headers: { Authorization: `Bearer ${token}` },
                        });

                         if (response.status === 200 && response.data.username === username) {
                            webviewView.webview.postMessage({ command: 'updateGitStatus', status: 'online' });
                            console.log('TAMBOSANDBOX: Gitlab: ping exitoso.');
                        } else {
                            webviewView.webview.postMessage({ command: 'updateGitStatus', status: 'offline' });
                            console.log('TAMBOSANDBOX: Gitlab: autenticacion fallida.');
                        }
                    } catch (error) {
                        webviewView.webview.postMessage({ command: 'updateGitStatus', status: 'offline' });
                        console.log(`TAMBOSANDBOX: gitPing ${error}`);
                    }

                case 'buttonClicked':
                    if (message.action === 'create') {
                        vscode.window.showInformationMessage('Creando sandbox...');
                        console.log('Creando sandbox...');
                        // Lógica para crear el sandbox
                    } else if (message.action === 'destroy') {
                        vscode.window.showInformationMessage('Destruyendo sandbox...');
                        console.log('Destruyendo sandbox...');
                        // Lógica para destruir el sandbox
                    }
                    break;

                case 'showMessage':
                    vscode.window.showInformationMessage(message.message);
                    break;
            }
        });
    }

    private getWebviewContent(): string {
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

        .airflow-buttons {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-start;
            gap: 10px;
        }

        .airflow-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 70px;
            height: 70px;
            border: 1px solid #0e639c;
            border-radius: 3px;
            text-align: center;
            font-size: 10px;
            color: #0e639c;
            cursor: pointer;
            transition: all 0.3s;
            background-color: transparent;
        }

        .airflow-btn:hover {
            background-color: #0e639c;
            color: #ffffff;
        }

        .airflow-btn .icon {
            width: 32px;
            height: 32px;
            margin-bottom: 5px;
        }

    </style>
</head>
<body>
    <div class="row">
        <div class="status">
            <span id="statusConnection" class="offline"></span>
            <b>Tambo: </b><span id="statusConnectionText">Desconectado</span>
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
            <span id="statusSandbox" class="offline"></span>
            <b>Sandbox: </b><span id="statusSandboxText">Inactivo</span>
        </div>
        <button id="connectButton" class="hidden">Crear</button>
    </div>

    <div class="row" style="padding-top:10px;">
        <div class="status">
            <b>Herramientas: </b>
        </div>
    </div>

    <div class="row airflow-buttons">
        <button class="airflow-btn">
            <img src="https://cdn.prod.website-files.com/627fe3133bae75e7bfbb9b2a/66c6c9ec336d4457d421d5ca_apache-airflow.png" class="icon">
            <span>Airflow</span>
        </button>
        <button class="airflow-btn">
            <img src="https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/144_Gitlab_logo_logos-512.png" class="icon">
            <span>GitLab</span>
        </button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let sandboxActive = false;

        document.getElementById('connectButton').addEventListener('click', () => {
            if (!sandboxActive) {
                vscode.postMessage({ command: 'buttonClicked', action: 'create' });
                vscode.postMessage({ command: 'showMessage', message: 'Creando sandbox' });
                document.getElementById('connectButton').textContent = 'Destruir';
                document.getElementById('statusSandbox').className = 'online';
                document.getElementById('statusSandboxText').textContent = 'Activo';
                sandboxActive = true;
            } else {
                vscode.postMessage({ command: 'buttonClicked', action: 'destroy' });
                vscode.postMessage({ command: 'showMessage', message: 'Destruyendo sandbox' });
                document.getElementById('connectButton').textContent = 'Crear';
                document.getElementById('statusSandbox').className = 'offline';
                document.getElementById('statusSandboxText').textContent = 'Inactivo';
                sandboxActive = false;
            }
        });

        function toggleCreateButton(connected) {
            const connectButton = document.getElementById('connectButton');
            if (connected) {
                connectButton.classList.remove('hidden');
            } else {
                connectButton.classList.add('hidden');
            }
        }

        window.addEventListener('message', (event) => {
            const message = event.data;

            if (message.command === 'updateStatus') {
                const statusConnection = document.getElementById('statusConnection');
                const statusConnectionText = document.getElementById('statusConnectionText');

                if (message.status === 'online') {
                    statusConnection.className = 'online';
                    statusConnectionText.textContent = 'Conectado';
                    toggleCreateButton(true);
                } else {
                    statusConnection.className = 'offline';
                    statusConnectionText.textContent = 'Desconectado';
                    toggleCreateButton(false);
                }
            }
        });

        function updateStatus() {
            vscode.postMessage({ command: 'checkApiStatus' });
            vscode.postMessage({ command: 'checkGitlabStatus' });
        }

        updateStatus();
        setInterval(updateStatus, 3000);
    </script>
</body>
</html>
        `;
    }
}
