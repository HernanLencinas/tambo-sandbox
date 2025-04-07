/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { decrypt, showStatusMessage } from './utils';
import { Sandbox } from './sandbox';
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

			const gitlabUrl = globalConfig.gitlabProtocol + globalConfig.gitlabUrl + globalConfig.gitlabAPIUser;
			const config = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
			const username = config.get<string>('username');
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

			return (
				[200].includes(response.status) &&
				typeof username === "string" &&
				typeof response.data.username === "string" &&
				username.toLowerCase() === response.data.username.toLowerCase()
			);

		} catch (error) {

			console.error("TAMBOSANDBOX.gitlab.status: ", error);
			return false;

		}

	}

	async cloneRepository() {

		new Sandbox().workspaceCurrentGroup();

		const configuration = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
		const currentUsername = configuration.get('username');
		const gitlabToken = configuration.get<string>('token') ? decrypt(configuration.get<string>('token')!) : null;
		const git: SimpleGit = simpleGit();
		const repoBranch = `${globalConfig.workspaceRepository?.branch ?? `airflow-sandbox-${currentUsername}`}`;
		const repoUrl = `${globalConfig.gitlabProtocol}${currentUsername}:${gitlabToken}@${globalConfig.gitlabUrl}/${globalConfig.workspaceRepository?.path}.git`;
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

				// Cambiar a la vista de explorador
				vscode.commands.executeCommand('workbench.view.explorer');

			})
			.catch((error: any) => {
				vscode.window.showErrorMessage(`Error al Clonar: ${error}`);
			});

	}

	async closeRepository() {

		vscode.workspace.updateWorkspaceFolders(0, 1);

	}

	async commitRepository(): Promise<boolean> {

		const sandbox = new Sandbox();
		await sandbox.workspaceCurrentGroup();

		const configuration = vscode.workspace.getConfiguration('tambo.sandbox');
		const currentUsername = configuration.get('gitlab.username');

		const originURL = await this.gitOrigin(); // Obtener URL del repositorio a partir de local
		// --> Devuelve: https://u519277:supersecreto@gitlab.com/telecom-argentina/cto/tambo/clientes/gnoc/tambo.git
		const originPath = originURL.split(globalConfig.gitlabUrl + '/')[1].replace(/\.git$/, '').toLocaleLowerCase();
		// --> Devuelve: telecom-argentina/cto/tambo/clientes/gnoc/tambo

		if (globalConfig.workspaceRepository?.path.toLocaleLowerCase() !== originPath) {
			showStatusMessage("‼️ El workspace no esta sincronizado");
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
					await git.commit(`[TAMBO:SANDBOX] Commit generado por ${currentUsername}`);
					await git.push();
					return true;
				} else {
					return false;
				}
			} catch (error) {
				showStatusMessage("Error al guardar los cambios");
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
				return origin.refs.fetch; // Devuelve la URL del repositorio remoto "origin"
			} else {
				return '';
			}
		} catch (error) {
			console.error(error);
			return '';
		}

	}

	async isGitAvailable(): Promise<boolean> {

		try {
			const git: SimpleGit = simpleGit();
			return (await git.version()).installed;
		} catch (err) {
			return false;
		}

	}

}
