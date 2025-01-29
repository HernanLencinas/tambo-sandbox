/// SWAGGER TAMBO SANDBOX ///
/// https://backend-sandbox.dev.apps.automation.teco.com.ar/docs

import * as vscode from 'vscode';
import { Connection } from './connection';
import { Sandbox } from './sandbox';
/* import { globalConfig } from './globals'; */
import { Gitlab } from './gitlab';

// file deepcode ignore InsecureTLSConfig: <please specify a reason of ignoring this>
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function activate(context: vscode.ExtensionContext) {

	// CARGAR CONFIGURACION DE CONExión A TAMBO SANDBOX
	const gitlab = new Gitlab();
	const sandbox = new Sandbox();
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

	/// CAPTURAR EL EVENTO DE GUARDADO ///	
	let saveListener = vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {


		const commitRes = await gitlab.commitRepository();
		if (commitRes) {
			sandbox.workspaceChangeGroup();
		}

	});
	context.subscriptions.push(saveListener);

}

export function deactivate() { }
