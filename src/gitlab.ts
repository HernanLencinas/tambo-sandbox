/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import * as https from 'https';
import * as path from 'path';
import * as os from 'os';
import axios from 'axios';
import { rimraf } from 'rimraf';
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';
import { decrypt, showStatusMessage } from './utils';
import { Sandbox } from './sandbox';
import { globalConfig } from './globals';

export class Gitlab {

	private getGitlabCredentials() {

		const config = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
		const username = config.get<string>('username') ?? '';
		const token = config.get<string>('token') ? decrypt(config.get<string>('token')!) : null;
		return { username, token };

	}

	private getTempDir() {

		return path.join(os.tmpdir(), 'tambosandbox');

	}

	private async deleteTempDir(tempDir: string) {
		
		try {
			showStatusMessage('Eliminando carpeta temporal');
			await rimraf(tempDir, { maxRetries: 5, retryDelay: 200 });
		} catch (err) {
			showStatusMessage('Error al eliminar carpeta temporal');
			console.error('No se pudo eliminar el directorio temporal:', err);
			throw err;
		}

	}

	async status(): Promise<boolean> {

		try {
			const { username, token } = this.getGitlabCredentials();
			if (!token) {
				return false;
			}

			const url = `${globalConfig.gitlabProtocol}${globalConfig.gitlabUrl}${globalConfig.gitlabAPIUser}`;
			const response = await axios.get(url, {
				httpsAgent: new https.Agent({ rejectUnauthorized: false }),
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				timeout: globalConfig.axiosTimeout,
				validateStatus: (status) => status === 200
			});

			return response.status === 200 &&
				username &&
				response.data.username &&
				username.toLowerCase() === response.data.username.toLowerCase();
		} catch (error) {
			console.error("TAMBOSANDBOX.gitlab.status:", error);
			return false;
		}
	}

	async cloneRepository() {

		try {
			await new Sandbox().workspaceCurrentGroup();

			const { username, token } = this.getGitlabCredentials();
			const git: SimpleGit = simpleGit();
			const repoBranch = `${globalConfig.workspaceRepository?.branch ?? `airflow-sandbox-${username}`}`;
			const repoUrl = `${globalConfig.gitlabProtocol}${username}:${token}@${globalConfig.gitlabUrl}/${globalConfig.workspaceRepository?.path}.git`;
			const tempDir = this.getTempDir();

			await this.deleteTempDir(tempDir);

			showStatusMessage('Clonando repositorio...');
			await git.clone(repoUrl, tempDir, ['--branch', repoBranch]);

			vscode.workspace.updateWorkspaceFolders(0, vscode.workspace.workspaceFolders?.length ?? 0, {
				uri: vscode.Uri.file(tempDir),
				name: globalConfig.workspaceRepository?.name.toUpperCase()
			});

			await vscode.commands.executeCommand('workbench.view.explorer');
			showStatusMessage('Repositorio Clonado');

		} catch (error) {
			console.error('TAMBOSANDBOX.gitlab.cloneRepository:', error);
			showStatusMessage('Error al clonar repositorio');
		}

	}

	async closeRepository() {

		showStatusMessage('Cerrando repositorio...');
		vscode.workspace.updateWorkspaceFolders(0, 1);
	
	}

	async commitRepository(): Promise<boolean> {

		const sandbox = new Sandbox();
		await sandbox.workspaceCurrentGroup();

		const config = vscode.workspace.getConfiguration('tambo.sandbox');
		const currentUsername = config.get('gitlab.username');
		const originURL = await this.gitOrigin();
		const originPath = originURL.split(globalConfig.gitlabUrl + '/')[1]?.replace(/\.git$/, '').toLowerCase();

		if (globalConfig.workspaceRepository?.path.toLowerCase() !== originPath) {
			showStatusMessage("‼️ El workspace no está sincronizado");
			return false;
		}

		if (!config.get('push')) {
			return true;
		}

		try {
			const git: SimpleGit = simpleGit({
				baseDir: vscode.workspace.rootPath,
				binary: 'git',
				config: ['core.autocrlf=false'],
			});

			const status = await git.status();
			if (status.files.length > 0) {
				await git.add('.');
				await git.commit(`[TAMBO:SANDBOX] Commit generado por ${currentUsername}`);
				await git.push();
				return true;
			}
		} catch (error) {
			showStatusMessage("Error al guardar los cambios");
			console.error('commitRepository error:', error);
		}

		return false;
	}

	async gitOrigin(): Promise<string> {
		
		try {
			const git: SimpleGit = simpleGit(vscode.workspace.rootPath);
			const remotes = await git.getRemotes(true);
			return remotes.find(r => r.name === 'origin')?.refs.fetch ?? '';
		} catch (error) {
			console.error('gitOrigin error:', error);
			return '';
		}

	}

	async isGitAvailable(): Promise<boolean> {

		try {
			const git: SimpleGit = simpleGit();
			return (await git.version()).installed;
		} catch {
			return false;
		}

	}
	
}