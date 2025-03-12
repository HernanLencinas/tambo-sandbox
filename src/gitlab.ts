/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { decrypt, showStatusMessage } from './utils';
import * as https from 'https';
import axios from 'axios';
import { globalConfig } from './globals';

import simpleGit, { RemoteWithRefs, SimpleGit, SimpleGitOptions } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';


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

	async cloneRepository() {

		const configuration = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
		const currentUsername = configuration.get('username');
		const git: SimpleGit = simpleGit();
		const repoBranch = `${globalConfig.workspaceRepository?.branch ?? `airflow-sandbox-${currentUsername}`}`;
		const repoUrl = `${globalConfig.gitlabUrl}/${globalConfig.workspaceRepository?.path}.git`;
		const tempDir = path.join(os.tmpdir(), 'vscode-tambosandbox');

		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}

		showStatusMessage('Clonando repositorio...');


		// Clonar el repositorio
		git.clone(repoUrl, tempDir, ['--branch', repoBranch])
			.then(() => {

				// Abrir el nuevo espacio de trabajo
				vscode.workspace.updateWorkspaceFolders(0, null, { uri: vscode.Uri.file(tempDir), name: "TAMBOSANDBOX" });

				// Establecer el rootPath en el explorador de archivos
				const newWorkspace = vscode.workspace.workspaceFolders?.find(folder => folder.uri.fsPath === tempDir);
				if (newWorkspace) {
					vscode.workspace.updateWorkspaceFolders(0, null, { uri: newWorkspace.uri, name: "TAMBOSANDBOX" });
				}

				showStatusMessage('Repositorio Clonado');

			})
			.catch((error: any) => {
				vscode.window.showErrorMessage(`Error al Clonar: ${error}`);
			});

	}

	async closeRepository() {

		vscode.workspace.updateWorkspaceFolders(0, 1);

	}

	async commitRepository(): Promise<boolean> {

		const configuration = vscode.workspace.getConfiguration('tambo.sandbox');
		const originURL = await this.gitOrigin();
		const regex = new RegExp('^' + globalConfig.gitlabUrl.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1') + '/', '');
		const repoPath = originURL.replace(regex, '').replace(/\.git$/, '');

		if (globalConfig.workspaceRepository?.path.toLocaleLowerCase() !== repoPath.toLowerCase()) {

			vscode.window.setStatusBarMessage('$(x) TAMBO-SANDBOX: El workspace no esta sincronizado', 10000);
			return false;

		}

		if (configuration.get('push')) {

			try {
				// Configuración de simple-git
				const options: Partial<SimpleGitOptions> = {
					baseDir: vscode.workspace.rootPath,
					binary: 'git',
					config: ['core.autocrlf=false'],
				};
				const git: SimpleGit = simpleGit(options);
				const status = await git.status();
				if (status.files.length > 0) {
					await git.add('.');
					await git.commit('TAMBO Sandbox Commit automatico');
					await git.push();
					vscode.window.setStatusBarMessage('$(check) TAMBO-SANDBOX: Cambios guardados', 10000);

					return true;

				} else {
					vscode.window.setStatusBarMessage('$(warning) TAMBO-SANDBOX: No hay cambios para guardar', 10000);
					return false;
				}
			} catch (error) {

				vscode.window.setStatusBarMessage('$(x) TAMBO-SANDBOX: Error al guardar los cambios', 10000);
				return false;
			}

		}

		return true;

	}

	async gitOrigin(): Promise<string> {

		try {
			// Obtener la URL del repositorio remoto "origin"
			const git: SimpleGit = simpleGit(vscode.workspace.rootPath);
			const remotes = await git.getRemotes(true); // Devuelve un array de remotos
			const origin = remotes.find(remote => remote.name === 'origin');

			if (origin) {
				console.log('Origin URL:', origin.refs.fetch); // URL del repositorio remoto
				return origin.refs.fetch; // Devuelve la URL del repositorio remoto "origin"
			} else {
				return '';
			}
		} catch (error) {
			console.error(error);
			return '';
		}

	}

}
