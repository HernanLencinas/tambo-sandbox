import * as vscode from 'vscode';
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export function activate(context: vscode.ExtensionContext) {

	// Configuración de simple-git
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
	context.subscriptions.push(saveListener);

	/* 	const git: SimpleGit = simpleGit();
	
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
			}); */






}

export function deactivate() { }


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


