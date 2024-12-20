/* eslint-disable @typescript-eslint/naming-convention */
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

            const response = await axios.get(sandboxUrl, {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                headers: {
                    'X-Usuario': username,
                    'X-Token-Gitlab': token
                }
            });

            return response;

        } catch (error) {

            console.error("TAMBOSANDBOX.sandbox.status: ", error);
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