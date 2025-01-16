/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { decrypt } from './utils';
import * as https from 'https';
import axios from 'axios';
import { globalConfig } from './globals';

export class Gitlab {

    async status(): Promise<any> {

        try {

            const gitlabUrl = globalConfig.gitlabUrl + globalConfig.gitlabAPIUser;
            const config = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
            const username = config.get<string>('username');
            const token = config.get<string>('token') ? decrypt(config.get<string>('token')!) : null;

            if (!username || !token) {
                return false;
            }

            const response = await axios.get(gitlabUrl, {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                headers: { Authorization: `Bearer ${token}` },
                timeout: globalConfig.axiosTimeout
            });
            return response;

        } catch (error) {

            console.error("TAMBOSANDBOX.gitlab.status: ", error);
            return false;

        }

    }

}