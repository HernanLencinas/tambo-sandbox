import * as vscode from 'vscode';
import { encrypt } from './utils';

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

            // Obtén la configuración actual
            const configuration = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');

            // Actualiza la configuración con los nuevos valores
            await configuration.update('username', gitlabUsername, vscode.ConfigurationTarget.Global);
            await configuration.update('token', encrypt(gitlabToken), vscode.ConfigurationTarget.Global);

            vscode.window.showInformationMessage(`TAMBO: Se configuro la conexion con TAMBO Sandbox`);

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
    static viewType = 'tambo_viewport_connections';
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext<unknown>,
        token: vscode.CancellationToken
    ): void | Thenable<void> {
        // Configurar el contenido de la WebView
        webviewView.webview.options = {
            enableScripts: true, // Permitir scripts en el WebView
        };

        webviewView.webview.html = this.getWebviewContent();

        // Comunicación entre WebView y la extensión
        webviewView.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case 'buttonClicked':
                    vscode.window.showInformationMessage('¡Botón clickeado desde la vista!');
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
						button {
                            background-color: #0e639c; /* Azul VS Code */
                            color: #ffffff; /* Texto blanco */
                            border: none;
                            padding: 10px 16px;
                            border-radius: 3px; /* Esquinas redondeadas */
                            font-size: 14px;
                            cursor: pointer;
                            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); /* Sombra sutil */
                            transition: background-color 0.2s, box-shadow 0.2s;
						}
					</style>
				</head>
				<body>
					<button id="connectButton">Conectar</button>
	
					<script>
						const vscode = acquireVsCodeApi();
	
						document.getElementById('connectButton').addEventListener('click', () => {
							vscode.postMessage({ command: 'buttonClicked', action: 'connect' });
						});
	
					</script>
				</body>
				</html>
			`;
    }
}
