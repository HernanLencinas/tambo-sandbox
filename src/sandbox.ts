/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { decrypt, showStatusMessage } from './utils';
import * as https from 'https';
import axios from 'axios';
import { globalConfig } from './globals';

export class Sandbox {

    async status(): Promise<boolean> {

        try {
            const sandboxUrl = `${globalConfig.sandboxUrl}${globalConfig.sandboxAPISandbox}`;
            const username = this.getUsername();

            if (!username) {
                return false;
            }

            const axiosConfig = this.getAxiosConfig([200, 404]);

            const response = await axios.get(`${sandboxUrl}?usuario=${encodeURIComponent(username)}`, axiosConfig);

            return [200, 404].includes(response.status);

        } catch (error) {
            console.error("TAMBOSANDBOX.sandbox.status:", error);
            return false;
        }

    }

    async workspaceStatus(): Promise<number> {

        try {
            const sandboxUrl = `${globalConfig.sandboxUrl}${globalConfig.sandboxAPISandbox}`;
            const username = this.getUsername();

            if (!username) {
                return 1;
            }

            const axiosConfig = this.getAxiosConfig([200]);

            return (await axios.get(`${sandboxUrl}?usuario=${encodeURIComponent(username)}`, axiosConfig)).data.estado;

        } catch (error) {
            return 1;
        }

    }

    async workspaceCurrentGroup() {

        try {
            const sandboxUrl = `${globalConfig.sandboxUrl}${globalConfig.sandboxAPISandbox}`;
            const username = this.getUsername();
            const axiosConfig = this.getAxiosConfig([200]);
            const response = await axios.get(`${sandboxUrl}?usuario=${encodeURIComponent(username ?? "")}`, axiosConfig);

            globalConfig.workspaceRepository = {
                name: response.data.equipo,
                path: response.data.repositorio.path,
                branch: response.data.repositorio.branch,
                repoid: response.data.repositorio.id,
                commit: false
            };

        } catch (error) {
            console.error("TAMBOSANDBOX.sandbox.workspaceCurrentGroup:", error);
        }

    }

    async respositories(): Promise<any> {

        try {
            const sandboxUrl = `${globalConfig.sandboxUrl}${globalConfig.sandboxAPIStatus}`;
            const username = this.getUsername();
            const token = this.getToken();

            if (!username || !token) {
                return {};
            }

            const axiosConfig = this.getAxiosConfig([200]);

            let response = (await axios.get(sandboxUrl, { ...axiosConfig, headers: { ...axiosConfig.headers, usuario: username, token: token } })).data.repos_disponibles;

            if (Array.isArray(response)) {
                response = response.sort((a: { path: string }, b: { path: string }) =>
                    a.path.localeCompare(b.path)
                );
            }

            if (!globalConfig.workspaceRepository) {
                const defaultRepo = response?.[0] ?? { path: '', id: '', branch: '' };
                globalConfig.workspaceRepository = {
                    name: (defaultRepo.path.match(/clientes\/(.*?)\/tambo/) || [])[1] || '',
                    path: defaultRepo.path,
                    branch: defaultRepo.branch,
                    repoid: defaultRepo.id,
                    commit: false,
                };
            }

            return response;
        } catch (error) {
            console.error("Error al obtener los repositorios:", error);
            return {};
        }
    }

    async createWorkspace(): Promise<boolean> {

        try {
            const sandboxUrl = `${globalConfig.sandboxUrl}${globalConfig.sandboxAPISandbox}`;
            const username = this.getUsername();
            const token = this.getToken();

            if (!username || !token || !globalConfig.workspaceRepository) {
                return false;
            }

            const axiosConfig = this.getAxiosConfig();

            const body = {
                id: `airflow-sandbox-${username}`,
                equipo: globalConfig.workspaceRepository.name.toLowerCase(),
                token: token,
                repositorio: {
                    id: globalConfig.workspaceRepository.repoid,
                    path: globalConfig.workspaceRepository.path,
                },
            };

            await axios.post(
                `${sandboxUrl}?usuario=${encodeURIComponent(username)}`,
                body,
                axiosConfig
            );

            return true;

        } catch (error) {
            console.error("TAMBOSANDBOX.sandbox.createWorkspace:", error);
            return false;
        }

    }

    async destroyWorkspace(): Promise<boolean> {

        try {
            const sandboxUrl = globalConfig.sandboxUrl + globalConfig.sandboxAPISandbox;
            const username = this.getUsername();

            if (!username) {
                return false;
            }

            const response = await axios.delete(sandboxUrl + "?usuario=" + username, {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                data: "{}",
                timeout: globalConfig.axiosTimeout
            });

            showStatusMessage("Se elimino el workspace");
            return true;

        } catch (error) {
            showStatusMessage("Error intentando eliminar el workspace.");
            return false;
        }

    }

    async commitWorkspaceChanges(): Promise<boolean> {

        try {
            const username = this.getUsername();
            const token = this.getToken();

            if (!username || !token || !globalConfig.workspaceRepository) {
                return false;
            }

            const axiosConfig = this.getAxiosConfig([200, 204]);

            const requestData = {
                id: `airflow-sandbox-${username}`,
                equipo: globalConfig.workspaceRepository.name.toLowerCase(),
                token: token,
                estado: 0,
                repositorio: {
                    id: globalConfig.workspaceRepository.repoid,
                    path: globalConfig.workspaceRepository.path,
                    branch: globalConfig.workspaceRepository.branch
                },
 //               clonado: "si",
 //               fecha_creacion: ""
            };

            await axios.patch(
                `${globalConfig.sandboxUrl}${globalConfig.sandboxAPISandbox}?usuario=${encodeURIComponent(username)}`,
                requestData,
                axiosConfig
            );

            showStatusMessage("Cambios actualizados");
            return true;

        } catch (error) {
            showStatusMessage("Error intentando guardar los cambios");
            console.error("TAMBOSANDBOX.sandbox.commitWorkspaceChanges:", error);
            return false;
        }

    }

    private getGitlabConfig() {
        return vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
    }

    private getUsername(): string | null {
        return this.getGitlabConfig().get<string>('username') ?? null;
    }

    private getToken(): string | null {
        const encryptedToken = this.getGitlabConfig().get<string>('token');
        return encryptedToken ? decrypt(encryptedToken) : null;
    }

    private getAxiosConfig(validStatuses: number[] = [200]): any {
        return {
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            timeout: globalConfig.axiosTimeout,
            headers: {
                'Content-Type': 'application/json',
            },
            validateStatus: (status: number) => validStatuses.includes(status),
        };
    }

}