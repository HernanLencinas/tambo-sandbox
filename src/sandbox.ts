/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { decrypt } from './utils';
import * as https from 'https';
import axios from 'axios';
import { globalConfig } from './globals';

export class Sandbox {

    async status(): Promise<boolean> {

        try {
            const sandboxUrl = `${globalConfig.sandboxUrl}${globalConfig.sandboxAPISandbox}`;
            const config = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
            const username = config.get<string>('username');

            if (!username) {
                return false;
            }

            const axiosConfig = {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                timeout: globalConfig.axiosTimeout,
                headers: {
                    'Content-Type': 'application/json',
                },
                validateStatus: (status: number) => [200, 404].includes(status)
            };

            const response = await axios.get(`${sandboxUrl}?usuario=${encodeURIComponent(username)}`, axiosConfig);

            return [200, 404].includes(response.status);

        } catch (error) {
            console.error("TAMBOSANDBOX.sandbox.create:", error);
            return false;
        }

    }

    async workspaceStatus(): Promise<number> {

        try {
            const sandboxUrl = `${globalConfig.sandboxUrl}${globalConfig.sandboxAPISandbox}`;
            const config = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
            const username = config.get<string>('username');

            if (!username) {
                return 1;
            }

            const axiosConfig = {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                timeout: globalConfig.axiosTimeout,
                headers: {
                    'Content-Type': 'application/json',
                },
                validateStatus: (status: number) => [200].includes(status)
            };

            return (await axios.get(`${sandboxUrl}?usuario=${encodeURIComponent(username)}`, axiosConfig)).data.estado;

        } catch (error) {
            return 1;
        }

    }

    async workspaceUpdateCurrentGroup() {

        try {
            const sandboxUrl = `${globalConfig.sandboxUrl}${globalConfig.sandboxAPISandbox}`;
            const config = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
            const username = config.get<string>('username');

            const axiosConfig = {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                timeout: globalConfig.axiosTimeout,
                headers: {
                    'Content-Type': 'application/json',
                },
                validateStatus: (status: number) => [200].includes(status)
            };

            const response = await axios.get(`${sandboxUrl}?usuario=${encodeURIComponent(username ?? "")}`, axiosConfig);

            globalConfig.workspaceRepository = {
                name: response.data.equipo,
                path: response.data.repositorio.path,
                repoid: response.data.repositorio.id,
                commit: false
            };

        } catch (error) {
            console.error("TAMBOSANDBOX.sandbox.workspaceUpdateCurrentGroup:", error);
        }

    }

    async respositories(): Promise<any> {

        try {
            const sandboxUrl = `${globalConfig.sandboxUrl}${globalConfig.sandboxAPIStatus}`;
            const config = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
            const username = config.get<string>('username');
            const encryptedToken = config.get<string>('token');
            const token = encryptedToken ? decrypt(encryptedToken) : null;

            if (!username || !token) {
                return {};
            }

            const axiosConfig = {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                timeout: globalConfig.axiosTimeout,
                headers: {
                    'Content-Type': 'application/json',
                    usuario: username,
                    token: token,
                },
                validateStatus: (status: number) => [200].includes(status),
            };

            let response = (await axios.get(sandboxUrl, axiosConfig)).data.repos_disponibles;

            if (Array.isArray(response)) {
                response = response.sort((a: { path: string }, b: { path: string }) =>
                    a.path.localeCompare(b.path)
                );
            }

            if (!globalConfig.workspaceRepository) {
                const defaultRepo = response?.[0] ?? { path: '', id: '' };
                globalConfig.workspaceRepository = {
                    name: (defaultRepo.path.match(/clientes\/(.*?)\/tambo/) || [])[1] || '',
                    path: defaultRepo.path,
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
            const config = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
            const username = config.get<string>('username');
            const encryptedToken = config.get<string>('token');
            const token = encryptedToken ? decrypt(encryptedToken) : null;

            if (!username || !token || !globalConfig.workspaceRepository) {
                return false;
            }

            const axiosConfig = {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                timeout: globalConfig.axiosTimeout,
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            const body = {
                id: "airflow-sandbox-u519277",
                equipo: globalConfig.workspaceRepository.name.toLowerCase(),
                token: token,
                repositorio: {
                    id: globalConfig.workspaceRepository.repoid,
                    path: globalConfig.workspaceRepository.path,
                    //branch: globalConfig.workspaceRepository.branch,
                },
            };

            console.log("TAMBO-CREAR_SANDBOX: ", body);

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
            const config = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
            const username = config.get<string>('username');

            if (!username) {
                return false;
            }

            const response = await axios.delete(sandboxUrl + "?usuario=" + username, {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                data: "{}",
                timeout: globalConfig.axiosTimeout
            });

            return true;

        } catch (error) {
            return false;
        }

    }

    // BUG: CAMBIAR NOMBRE DE LA FUNCION
    
    async workspaceChangeGroup(): Promise<boolean> {

        try {
            const sandboxUrl = `${globalConfig.sandboxUrl}${globalConfig.sandboxAPISandbox}`;
            const config = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
            const username = config.get<string>('username');
            const encryptedToken = config.get<string>('token');
            const token = encryptedToken ? decrypt(encryptedToken) : null;
            const axiosConfig = {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                timeout: globalConfig.axiosTimeout,
                headers: {
                    'Content-Type': 'application/json',
                },
                validateStatus: (status: number) => [200, 204].includes(status),
            };
            const requestData = {
                id: `airflow-sandbox-${username}`,
                equipo: globalConfig.workspaceRepository?.name.toLowerCase(),
                token: token,
                estado: 0,
                repositorio: {
                    id: globalConfig.workspaceRepository?.repoid,
                    path: globalConfig.workspaceRepository?.path,
                },
            };

            await axios.patch(
                `${sandboxUrl}?usuario=${encodeURIComponent(username ?? "")}`,
                requestData,
                axiosConfig
            );

            return true;

        } catch (error) {
            console.error("TAMBOSANDBOX.sandbox.workspaceChangeGroup:", error);
            return false;
        }
        
    }

}