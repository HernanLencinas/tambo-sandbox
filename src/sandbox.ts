import * as vscode from 'vscode';
import { decrypt } from './utils';
import * as https from 'https';
import axios from 'axios';
import { globalConfig } from './globals';

export class Sandbox {

    async ping(): Promise<boolean> {

        try {

            const sandboxUrl = globalConfig.sandboxUrl + globalConfig.sandboxAPIPing;

            const response = await axios.get(sandboxUrl, {
                httpsAgent: new https.Agent({ rejectUnauthorized: false })
            });
            return response.status === 200;

        } catch (error) {

            console.error("TAMBOSANDBOX:sandbox.status:", error);
            return false;

        }

    }

    async statusWorkspace(): Promise<any> {

        try {

            const sandboxUrl = globalConfig.sandboxUrl + globalConfig.sandboxAPIStatus;
            const config = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
            const username = config.get<string>('username');
            const token = config.get<string>('token') ? decrypt(config.get<string>('token')!) : null;

            if (!username || !token) {
                return false;
            }

            const response = await axios.get(sandboxUrl, {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                headers: { user: username, token: token },
            });
            return response;

        } catch (error) {

            console.error("TAMBOSANDBOX:sandbox.status:", error);
            return false;

        }

    }

    async createWorkspace(): Promise<boolean> {

        try {

            const sandboxUrl = globalConfig.sandboxUrl + globalConfig.sandboxAPICreate;
            const config = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
            const username = config.get<string>('username');
            const token = config.get<string>('token') ? decrypt(config.get<string>('token')!) : null;
            const requestBody = {
                hola: "123",
                mundo: "abcd"
            };

            if (!username || !token) {
                return false;
            }

            const response = await axios.post(sandboxUrl, requestBody, {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                headers: { user: username, token: token },
            });
            return response.status === 200;

        } catch (error) {

            console.error("TAMBOSANDBOX:sandbox.createWorkspace:", error);
            return false;

        }

    }

    async destroyWorkspace() {

        try {

            const sandboxUrl = globalConfig.sandboxUrl + globalConfig.sandboxAPIDestroy;
            const config = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
            const username = config.get<string>('username');
            const token = config.get<string>('token') ? decrypt(config.get<string>('token')!) : null;
            const requestBody = {
                hola: "123",
                mundo: "abcd"
            };

            if (!username || !token) {
                return false;
            }

            const response = await axios.post(sandboxUrl, requestBody, {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                headers: { user: username, token: token },
            });
            return response.status === 200;

        } catch (error) {

            console.error("TAMBOSANDBOX:sandbox.createWorkspace:", error);
            return false;

        }

    }

    async commitWorkspace() {

        try {

            const sandboxUrl = globalConfig.sandboxUrl + globalConfig.sandboxAPIUpdate;
            const config = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
            const username = config.get<string>('username');
            const token = config.get<string>('token') ? decrypt(config.get<string>('token')!) : null;
            const requestBody = {
                hola: "123",
                mundo: "abcd"
            };

            if (!username || !token) {
                return false;
            }

            const response = await axios.post(sandboxUrl, requestBody, {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                headers: { user: username, token: token },
            });
            return response.status === 200;

        } catch (error) {

            console.error("TAMBOSANDBOX:sandbox.createWorkspace:", error);
            return false;

        }

    }

}