/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { encrypt } from './utils';
import { Sandbox } from './sandbox';
import { Gitlab } from './gitlab';
import { globalConfig } from './globals';
import { VSCESetttings } from './config';
import { md5 } from "hash-wasm";
import { showStatusMessage } from './utils';

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
            const configuration = vscode.workspace.getConfiguration('tambo.sandbox');
            await configuration.update('gitlab.username', gitlabUsername.toLowerCase(), vscode.ConfigurationTarget.Global);
            await configuration.update('gitlab.token', encrypt(gitlabToken), vscode.ConfigurationTarget.Global);
            showStatusMessage('Se configuro la conexión');
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

            globalConfig.contextConfigStatus = true;
            vscode.commands.executeCommand('setContext', 'tambo.configDefined', true);
            this.provider?.ping("sandboxStatus");
            
            if (nuevoGitlabUsername) {
                await configuration.update('username', nuevoGitlabUsername.toLowerCase(), vscode.ConfigurationTarget.Global);
            }

            if (nuevoGitlabToken) {
                await configuration.update('token', encrypt(nuevoGitlabToken), vscode.ConfigurationTarget.Global);
            }

            showStatusMessage('Se edito correctamente la conexión');

        } else {
            vscode.window.showInformationMessage('TAMBO-SANDBOX: Fallo al intentar configurar la conexión');
            showStatusMessage('Error al configurar la conexión');
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
            vscode.commands.executeCommand('setContext', 'tambo.configDefined', false);
            showStatusMessage('Se elimino correctamente la conexión');
        }

    }

    load(context: vscode.ExtensionContext) {

        try {
            // Crear una única instancia del proveedor
            showStatusMessage("Cargando...");
            this.provider = new ConnectionsViewProvider(context);

            context.subscriptions.push(
                vscode.window.registerWebviewViewProvider(
                    ConnectionsViewProvider.viewType,
                    this.provider
                )
            );
        } catch (error) {
            showStatusMessage("Error activando la extension.");
            console.error("TAMBOSANDBOX.connection.load: ", error);
        }

    }

    isConfigured(): boolean {
        const config = vscode.workspace.getConfiguration('tambo.sandbox');
        const username = config.get<string>('gitlab.username');
        const token = config.get<string>('gitlab.token');

        vscode.commands.executeCommand('setContext', 'tambo.configDefined', !!username && !!token);

        return !!username && !!token;
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
            localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'resources')]
        };

        this.updateWebviewContent();

        new Connection().isConfigured();

        webviewView.webview.onDidReceiveMessage(async (message) => {

            switch (message.command) {

                case 'sandboxStatus':

                    if (globalConfig.contextConfigStatus) {

                        const htmlStatusSandbox = await configureStatus();
                        globalConfig.workspaceStatusHash = "";
                        globalConfig.contextConfigStatus = false;
                        webviewView.webview.postMessage({
                            command: 'sandboxConnectionStatus',
                            data: htmlStatusSandbox
                        });

                    } else {

                        const htmlStatusSandbox = await updateStatus(this.context.extensionUri);
                        const hash = (await md5(htmlStatusSandbox)).slice(-5);
                        if (globalConfig.workspaceStatusHash !== hash) {
                            globalConfig.workspaceStatusHash = hash;
                            webviewView.webview.postMessage({
                                command: 'sandboxConnectionStatus',
                                data: htmlStatusSandbox
                            });
                        }

                    }
                    break;

                case 'openLink':
                    if (message.link) {
                        const res = vscode.env.openExternal(vscode.Uri.parse(message.link));
                        if (!res) {
                            vscode.window.showErrorMessage("TAMBO-SANDBOX: No se pudo abrir el enlace.");
                        }
                    }
                    break;

                case 'sandboxWizard':
                    vscode.commands.executeCommand('tambosandbox.connectionWizard');
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
                        if (!response) {
                            vscode.window.showErrorMessage("TAMBO: Ha ocurrido un error al intentar iniciar el workspace en Sandbox");
                        } else {
                            webviewView.webview.postMessage({
                                command: 'deployingStatus'
                            });
                        }

                    }
                    break;

                case 'sandboxDestroy':
                    const destroyWorkspaceRes = await vscode.window.showInformationMessage(
                        '¿Destruir el workspace actualmente en ejecuccion?',
                        { modal: true }, // Modal para la confirmación
                        'Sí'
                    );

                    if (destroyWorkspaceRes === 'Sí') {
                        const sandbox = new Sandbox();
                        const response = await sandbox.destroyWorkspace();
                        if (!response) {
                            vscode.window.showErrorMessage("TAMBO: Ha ocurrido un error intentando destruir el workspace en Sandbox");
                        } else {
                            const gitlab = new Gitlab();
                            gitlab.closeRepository();
                            webviewView.webview.postMessage({
                                command: 'destroyingStatus'
                            });
                        }
                    }
                    break;

                case 'sandboxChangeGroup':
                    const configuration = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
                    const currentUsername = configuration.get('username');

                    if (!message.data.commit) {
                        globalConfig.workspaceRepository = {
                            name: message.data.name,
                            path: message.data.path,
                            branch: `airflow-sandbox-${currentUsername}`,
                            repoid: message.data.repoid,
                            commit: message.data.commit
                        };
                        break;
                    }

                    const changeWorkspaceGroupRes = await vscode.window.showWarningMessage(
                        `Está a punto de cambiar al grupo ${message.data.name}.\n\n` +
                        `⚠️ Este cambio afectará su configuración de trabajo actual. Se clonara el repositorio de este grupo en el workspace activo.\n\n` +
                        `¿Desea continuar?`,
                        { modal: true },
                        'Sí'
                    );

                    if (changeWorkspaceGroupRes === 'Sí') {

                        globalConfig.workspaceRepository = {
                            name: message.data.name,
                            path: message.data.path,
                            branch: `airflow-sandbox-${currentUsername}`,
                            repoid: message.data.repoid,
                            commit: message.data.commit
                        };

                        const sandbox = new Sandbox();
                        const response = await sandbox.commitWorkspaceChanges();
                        if (!response) {

                            await updateStatus(this.context.extensionUri);
                            vscode.window.showErrorMessage("TAMBO: Ha ocurrido un error intentando cambiar de grupo en Sandbox");

                        } else {

                            webviewView.webview.postMessage({
                                command: 'cloningStatus'
                            });

                            const gitlab = new Gitlab();
                            await gitlab.cloneRepository();

                        }
                    } else {

                        webviewView.webview.postMessage({
                            command: 'revertStatus'
                        });

                    }

                    break;

                case 'cloneRepository':
                    const cloneRepositoryRes = await vscode.window.showInformationMessage(
                        `¿Desea confirmar la clonación del repositorio localmente y abrirlo en el explorer de Visual Studio Code?"`,
                        { modal: true },
                        'Sí'
                    );

                    if (cloneRepositoryRes === 'Sí') {

                        webviewView.webview.postMessage({
                            command: 'cloningStatus'
                        });

                        const gitlab = new Gitlab();
                        await gitlab.cloneRepository();
                    }

                    break;

                case 'sandboxAutoPush':
                    const settings = new VSCESetttings();
                    await settings.setAutoPush(message.enable);

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

    ping(command: string): void {

        if (this.webviewView) {
            this.webviewView.webview.postMessage({
                command: 'ping',
                data: command
            });
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

        const styleUri = this.webviewView?.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'styles', 'wizard.css')
        );
        const scriptUri = this.webviewView?.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'scripts', 'wizard.js')
        );

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleUri}" rel="stylesheet">
            </head>
            <body>
                <h2>¡BIENVENIDO A TAMBO SANDBOX!</h2>
                <p>Parece que aún no has configurado tu conexión al Sandbox.
                <p>Para comenzar deberás primero registrar una nueva conexión. Puedes hacerlo utilizando nuestro asistente de configuración.
                <p><button onclick="invokeWizard()" class="wizard-button"><b>ASISTENTE DE CONEXION</b></button>
                <p>El asistente te guiará paso a paso en el proceso de registro.
                <p>Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos a través de nuestro correo <a href="mailto:frameautomation@teco.com.ar">frameautomation@teco.com.ar</a>
            </body>
            <script src="${scriptUri}"></script>
            </html>
        `;

    }

    private getConnectionContent(vscodeURI: vscode.Uri): string {

        const styleUri = this.webviewView?.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'styles', 'sandbox.css')
        );
        const scriptUri = this.webviewView?.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'scripts', 'sandbox.js')
        );

        return `
            <!DOCTYPE html>
            <html lang="en">
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${styleUri}" rel="stylesheet">
            <body>
                <div id="sandboxPanelStatus">
                    <div class="container">
                        <div class="spinner1"></div>
                        <h2>Iniciando...</h2>
                        <p>Un momento por favor...</p>
                    </div>
                </div>
            </body>
            <script src="${scriptUri}"></script>
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
                await sandbox.workspaceCurrentGroup();
                const workspaceChangeReposHTML = await htmlRepos(globalConfig.workspaceRepositories, true);
                const cloneButtonHTML = await htmlCloneRepository();
                const destroyButtonHTML = await htmlDestroyWorkspace();

                actionButtonHTML = `
                    ${workspaceChangeReposHTML}
                    ${workspaceToolsHTML}
                    ${cloneButtonHTML}
                    ${destroyButtonHTML}
                    `;
                break;
            case 1:
                globalConfig.workspaceRepositories = await sandbox.respositories();
                const workspaceReposHTML = await htmlRepos(globalConfig.workspaceRepositories, false);
                const startButtonHTML = await htmlStartWorkspace();
                workspaceStatus = { estado: 1, clase: 'offline', texto: 'Desconectado', warningMessage: 'No tienes un workspace asignado. Para iniciar uno nuevo, haz clic en el botón <b>Iniciar workspace</b> para comenzar.' };
                actionButtonHTML = `
                    ${workspaceReposHTML}
                    ${startButtonHTML}
                `;
                break;
            case 2:
                workspaceStatus = { estado: 2, clase: 'deploying', texto: 'Deployando', warningMessage: 'Se está deployando su espacio de trabajo, esto puede demorar aproximadamente 3 minutos ☕️' };
                actionButtonHTML = `
                    <div class="container9">
                        <div class="spinner_orange"></div>
                        <h2>Deployando...</h2>
                        <p style="margin-top: -5px;">Un momento por favor...</p>
                    </div>
                `;
                break;
            case 3:
                workspaceStatus = { estado: 3, clase: 'deploying', texto: 'Deployando', warningMessage: 'Se está deployando su espacio de trabajo, esto puede demorar aproximadamente 3 minutos.' };
                actionButtonHTML = `
                    <div class="container9">
                        <div class="spinner_orange"></div>
                        <h2>Deployando...</h2>
                        <p style="margin-top: -5px;">Un momento por favor...</p>
                    </div>
                `;
                break;
            case 666:
                workspaceStatus = { estado: 666, clase: 'destroying', texto: 'Destruyendo', warningMessage: 'Se está destruyendo su espacio de trabajo, este proceso puede demorar unos minutos.' };
                actionButtonHTML = `
                    <div class="container9">
                        <div class="spinner_orange"></div>
                        <h2>Destruyendo...</h2>
                        <p>Un momento por favor...</p>
                    </div>
                `;
                break;
        }
    }

    let html = ``;
    const config = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
    const username = config.get<string>('username');

    html += createStatusHTML("Sandbox", sandboxStatus ? `Conectado ${username}` : "Desconectado", sandboxStatus ? 'online' : 'offline', sandboxStatus ? "" : "No se pudo establecer conexión con el servicio de Sandbox. Verifique sus credenciales o conexión a la red asegúrandose de estar conectado a la VPN Corporativa.");
    html += createStatusHTML("Git", gitStatus ? "Conectado" : "Desconectado", gitStatus ? 'online' : 'offline', gitStatus ? "" : "Autenticación fallida. Por favor, verifique que su usuario y token sean correctos.");
    html += createStatusHTML("Workspace", workspaceStatus.texto, workspaceStatus.clase, workspaceStatus.warningMessage);
    html += actionButtonHTML;

    function createStatusHTML(
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

        const isGitAvailable = gitlab.isGitAvailable();
        if (title === "Git" && !isGitAvailable) {
            additionalMessage = `<div class="row">
                                    <div class="status-msg">
                                        <span class="arrow">&#x21B3;</span>
                                        <span class="icon">❌</span>
                                        <span class="msg">El comando <b>git</b> no está disponible en el sistema. Por favor, asegurate de que esté instalado correctamente y que el ejecutable se encuentre incluido en la variable de entorno PATH.</span>
                                    </div>
                                </div>`;
        }

        return `<div class="row">
                    <div class="status">
                        <span class="${clase}"></span>
                        <b>${title}: </b>
                        <span style="width:500px;">${status}</span>
                    </div>
                </div>
                ${additionalMessage}
                `;
    }

    return html;

}

async function htmlRepos(repositoriesList: any, commit: boolean, selectedGroup: string = ""): Promise<string> {

    if (!Array.isArray(repositoriesList) || repositoriesList.length === 0) {
        return `
            <div class="row" style="padding: 5px 0px 0px 10px;">
                <b>⚠️&nbsp;&nbsp;El listado de grupos no esta disponible en este momento</b>
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
            <button class="apps-button" data-link="https://gitlab.com/telecom-argentina/cto/tambo/clientes">
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
        <div class="row">
            <button id="cloneSandboxButton" onclick="cloneRepository();" class="sandbox-button" >
                <div id="cloneSandboxSpinner" class="spinner"></div>
                <span id="cloneSandboxButtonText" style="font-weight:normal">CLONAR REPOSITORIO</span>
            </button>
        </div>
    `;

    return html;

}

async function htmlDestroyWorkspace(): Promise<string> {

    const html = `
        <div class="row">
            <button id="destroySandboxButton" onclick="destroySandbox();" class="sandbox-button">
                <div id="destroySandboxSpinner" class="spinner"></div>
                <span id="destroySandboxButtonText">DESTRUIR WORKSPACE</span>
            </button>
        </div>
        `;

    return html;

}

async function htmlStartWorkspace(): Promise<string> {

    const html = `
        <div class="row" style="padding-top: 10px;">
            <button id="deploySandboxButton" onclick="createSandbox();" class="sandbox-button">
                <div id="deploySandboxSpinner" class="spinner"></div>
                <span id="deploySandboxButtonText">🚀&nbsp;&nbsp;INICIAR WORKSPACE</span>
            </button>
        </div>
        `;

    return html;

}

async function configureStatus(): Promise<string> {

    const html = `
        <div id="sandboxPanelStatus">
            <div class="container">
                <div class="spinner1"></div>
                <h2>Configurando...</h2>
                <p>Un momento por favor...</p>
            </div>
        </div>
        `;

    return html;

}