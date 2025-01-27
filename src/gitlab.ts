/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { decrypt } from './utils';
import * as https from 'https';
import axios from 'axios';
import { globalConfig } from './globals';

//import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';
//import * as fs from 'fs';
//import * as path from 'path';
//import * as os from 'os';


export class Gitlab {

    async status(): Promise<boolean> {

        try {

            const gitlabUrl = globalConfig.gitlabUrl + globalConfig.gitlabAPIUser;
            const config = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
            const token = config.get<string>('token') ? decrypt(config.get<string>('token')!) : null;

            if (!token) {
                return false;
            }

            const response = await axios.get(gitlabUrl, {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                timeout: globalConfig.axiosTimeout,
                validateStatus: (status: number) => [200].includes(status)
            });

            return [200].includes(response.status);

        } catch (error) {

            console.error("TAMBOSANDBOX.gitlab.status: ", error);
            return false;

        }

    }

}

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



