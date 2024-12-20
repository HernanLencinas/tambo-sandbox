import * as vscode from 'vscode';
//import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';
//import * as fs from 'fs';
//import * as path from 'path';
//import * as os from 'os';

import { Connection } from './connection';
import { GruposTreeProvider, GrupoItem } from './grupos';

// file deepcode ignore InsecureTLSConfig: <please specify a reason of ignoring this>
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export function activate(context: vscode.ExtensionContext) {

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


	// VIEWPORT GRUPOS
	const gruposTreeProvider = new GruposTreeProvider(context);
	vscode.window.registerTreeDataProvider('tambo_viewport_grupos', gruposTreeProvider);


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

/* function cloneRepository() {

	const git: SimpleGit = simpleGit();
	const repoUrl = 'https://git.cloudvalley.telecom.com.ar/automatizacion/ansible-test.git';
	const tempDir = path.join(os.tmpdir(), 'vscode-tambosandbox');

	// Verificar si la carpeta existe y eliminarla si es necesario
	if (fs.existsSync(tempDir)) {
		fs.rmSync(tempDir, { recursive: true, force: true });
	}

	// Clonar el repositorio
	git.clone(repoUrl, tempDir)
		.then(() => {

			// Abrir el nuevo espacio de trabajo
			vscode.workspace.updateWorkspaceFolders(0, null, { uri: vscode.Uri.file(tempDir), name: 'TAMBOSANDBOX' });

			// Establecer el rootPath en el explorador de archivos
			const newWorkspace = vscode.workspace.workspaceFolders?.find(folder => folder.uri.fsPath === tempDir);
			if (newWorkspace) {
				vscode.workspace.updateWorkspaceFolders(0, null, { uri: newWorkspace.uri, name: 'TAMBOSANDBOX' });
			}

			vscode.window.showInformationMessage('Repositorio Clonado.');

		})
		.catch((error) => {
			vscode.window.showErrorMessage(`Error al Clonar: ${error}`);
		});

} */

/* function pushRepository() {

	// Configuración de simple-git
	const options: Partial<SimpleGitOptions> = {
		baseDir: vscode.workspace.rootPath,
		binary: 'git',
		config: ['core.autocrlf=false'],
	};
	const git: SimpleGit = simpleGit(options);

	try {
		// Realiza git add para todos los cambios
		git.add('.');
		// Crea el commit automáticamente
		git.commit('Auto-commit desde VSCode');
		// Realiza el push de los cambios
		git.push();

		vscode.window.showInformationMessage('TAMBO: Repositorio Actualizado');
	} catch (error) {
		vscode.window.showErrorMessage(`TAMBO: Error al Actualizar - ${error}`);
	}

} */

/* 	// Configuración de simple-git
	const options: Partial<SimpleGitOptions> = {
		baseDir: vscode.workspace.rootPath,
		binary: 'git',
		config: ['core.autocrlf=false'],
	};
	const git: SimpleGit = simpleGit(options);
	
	// Capturar el evento de guardado
	let saveListener = vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
		try {
			// Realiza git add para todos los cambios
			await git.add('.');
			// Crea el commit automáticamente
			await git.commit('Auto-commit desde VSCode');
			// Realiza el push de los cambios
			await git.push();
	
			vscode.window.showInformationMessage('TAMBO: Repositorio Actualizado');
		} catch (error) {
			vscode.window.showErrorMessage(`TAMBO: Error al Actualizar - ${error}`);
		}
	});
	context.subscriptions.push(saveListener); */

