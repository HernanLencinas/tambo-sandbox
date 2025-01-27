/// SWAGGER TAMBO SANDBOX ///
/// https://backend-sandbox.dev.apps.automation.teco.com.ar/docs

import * as vscode from 'vscode';
import { Connection } from './connection';
import { Sandbox } from './sandbox';
import { globalConfig } from './globals';

// file deepcode ignore InsecureTLSConfig: <please specify a reason of ignoring this>
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function activate(context: vscode.ExtensionContext) {

	// CARGAR CONFIGURACION DE CONExión A TAMBO SANDBOX
	const connection = new Connection();
	connection.load(context);

	// ESCUCHAR CAMBIOS EN LA CONFIGURACION
	vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration('tambo.sandbox.gitlab.username') ||
			event.affectsConfiguration('tambo.sandbox.gitlab.token')) {
			vscode.commands.executeCommand('tambosandbox.connectionRefresh');
		}
	});

	// COMANDOS DE CONExión
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



	// Registrar el comando para seleccionar un grupo
	/*     context.subscriptions.push(
			vscode.commands.registerCommand('tambo.grupos.select', (item) => {
				vscode.window.showInformationMessage(`Repositorio seleccionado: ${item.repositorio}`);
			})
		); */

	// Registrar un comando para refrescar el árbol (opcional)
	/*     context.subscriptions.push(
			vscode.commands.registerCommand('tambo.grupos.refresh', () => gruposTreeProvider.refresh())
		); */

	/// CAPTURAR EL EVENTO DE GUARDADO ///	
	/* let saveListener = vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
		vscode.window.showInformationMessage('Capturando eventos');
		pushRepository();
	});
	context.subscriptions.push(saveListener); */

	/// CLONAR REPOSITORIO ///
	/* const cmdCloneRepository = vscode.commands.registerCommand('tambosandbox.cloneRepository', async () => {
		cloneRepository();
	});
	context.subscriptions.push(cmdCloneRepository); */

}

export function deactivate() { }
