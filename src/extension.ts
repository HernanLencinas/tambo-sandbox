/// SWAGGER TAMBO SANDBOX ///
/// https://backend-sandbox.dev.apps.automation.teco.com.ar/docs

import * as vscode from 'vscode';
import { Connection } from './connection';
import { Sandbox } from './sandbox';
import { showStatusMessage } from './utils';
import { Gitlab } from './gitlab';
import { globalConfig } from './globals';

// file deepcode ignore InsecureTLSConfig: <please specify a reason of ignoring this>
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function activate(context: vscode.ExtensionContext) {

	// CARGAR CONFIGURACION DE CONExión A TAMBO SANDBOX
	const gitlab = new Gitlab();
	const sandbox = new Sandbox();
	const connection = new Connection();

	connection.load(context);

	// ESCUCHAR CAMBIOS EN LA CONFIGURACION
	vscode.workspace.onDidChangeConfiguration(async event => {
		if (event.affectsConfiguration('tambo.sandbox.gitlab.username') ||
			event.affectsConfiguration('tambo.sandbox.gitlab.token')) {
			vscode.commands.executeCommand('tambosandbox.connectionRefresh');
		}
		if (event.affectsConfiguration('tambo.sandbox.developer')) {
			globalConfig.sandboxUrl = vscode.workspace.getConfiguration().get('tambo.sandbox.developer')
				? 'https://backend-sandbox.dev.apps.automation.teco.com.ar'
				: 'https://backend.sandbox.automation.teco.com.ar';
		}
	});

	// COMANDOS DE CONEXION
	const cmdConnectionWizard = vscode.commands.registerCommand('tambosandbox.connectionWizard', async () => {
		connection.wizard();
	});
	context.subscriptions.push(cmdConnectionWizard);

	const cmdConnectionEdit = vscode.commands.registerCommand('tambosandbox.connectionEdit', async () => {
		connection.edit();
		vscode.commands.executeCommand('tambosandbox.connectionRefresh');
	});
	context.subscriptions.push(cmdConnectionEdit);

	const cmdConnectionDelete = vscode.commands.registerCommand('tambosandbox.connectionDelete', async () => {
		connection.delete();
	});
	context.subscriptions.push(cmdConnectionDelete);

	const cmdConnectionRefresh = vscode.commands.registerCommand('tambosandbox.connectionRefresh', async () => {
		connection.refresh();
	});
	context.subscriptions.push(cmdConnectionRefresh);

	/// CAPTURAR EL EVENTO DE GUARDADO ///	
	let saveListener = vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
		if (vscode.workspace.getConfiguration('tambo.sandbox').get('push')) {
			const commitRes = await gitlab.commitRepository();
			if (commitRes) {
				showStatusMessage("Cambios guardados");
				sandbox.commitWorkspaceChanges();
			} else {
				showStatusMessage("No hay cambios para guardar");
			}
		}
	});
	context.subscriptions.push(saveListener);

	// ABRIR ITICKET
	const openItickets = vscode.commands.registerCommand('tambo.openItickets', () => {
		const url = vscode.Uri.parse(globalConfig.iTicketUrl);
		vscode.env.openExternal(url);
	});
	context.subscriptions.push(openItickets);

	const developerMode = vscode.commands.registerCommand('tambosandbox.developerMode', async () => {
		const config = vscode.workspace.getConfiguration();
		const isDeveloper = config.get<boolean>('tambo.sandbox.developer', false);

		const options = isDeveloper
			? ['Desarrollo', 'Playground']
			: ['Playground', 'Desarrollo'];

		const selected = await vscode.window.showQuickPick(options, {
			placeHolder: 'Selecciona el Ambiente',
			canPickMany: false
		});

		if (selected) {

			const confirm = await vscode.window.showWarningMessage(
				`¿Estás seguro que deseas cambiar el ambiente a "${selected}"?`,
				{ modal: true },
				'Sí', 'No'
			);

			if (confirm === 'Sí') {
				switch (selected) {
					case 'Desarrollo':
						await config.update('tambo.sandbox.developer', true, vscode.ConfigurationTarget.Global);
						vscode.window.showInformationMessage('TAMBO: Configurando conexión con el ambiente de Desarrollo.');
						break;
					case 'Playground':
						await config.update('tambo.sandbox.developer', false, vscode.ConfigurationTarget.Global);
						vscode.window.showInformationMessage('TAMBO: Configurando conexión con el ambiente de Playground.');
						break;
				}
				gitlab.closeRepository();
			}

		}
	});
	context.subscriptions.push(developerMode);

	showStatusMessage("Listo");

}

export function deactivate() { }