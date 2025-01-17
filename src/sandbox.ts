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
                    token: token
                },
                validateStatus: (status: number) => [200].includes(status)
            };

            return (await axios.get(sandboxUrl, axiosConfig)).data.repos_disponibles;

        } catch (error) {
            return {};
        }

    }

    async createWorkspace(): Promise<boolean> {

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
            };

            await axios.post(`${sandboxUrl}?usuario=${encodeURIComponent(username)}`, {}, axiosConfig);

            return true;

        } catch (error) {
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

}