import * as vscode from 'vscode';
import { decrypt } from './utils';
import * as https from 'https';
import axios from 'axios';
import { globalConfig } from './globals';

export class Sandbox {

    async statusWorkspace(): Promise<any> {

        try {

            const sandboxUrl = globalConfig.sandboxUrl + globalConfig.sandboxAPIStatus;
            const config = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
            const username = config.get<string>('username');
            const token = config.get<string>('token') ? decrypt(config.get<string>('token')!) : null;

            if (!username || !token) {
                return false;
            }

            const params = new URLSearchParams({
                usuario: username,
                token: token
            });

            const response = await axios.get(`${sandboxUrl}?${params.toString()}`, {
                httpsAgent: new https.Agent({ rejectUnauthorized: false })
            });

            return response;

        } catch (error) {

            console.error("TAMBOSANDBOX:sandbox.status:", error);
            return false;

        }

    }

    async createWorkspace() {

    }

    async destroyWorkspace() {

    }

    async commitWorkspace() {

    }

}