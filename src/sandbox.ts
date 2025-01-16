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
                    'usuario': username,
                    'token': token
                },
                timeout: globalConfig.axiosTimeout

            });

            return response;

        } catch (error) {

            console.error("TAMBOSANDBOX.sandbox.status: ", error);
            return false;

        }

    }

    async createWorkspace(): Promise<boolean> {

        try {
            const sandboxUrl = `${globalConfig.sandboxUrl}${globalConfig.sandboxAPICreate}`;
            const config = vscode.workspace.getConfiguration('tambo.sandbox.gitlab');
            const username = config.get<string>('username');

            if (!username) {
                console.warn("No se encontró el nombre de usuario en la configuración.");
                return false;
            }

            const axiosConfig = {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                timeout: globalConfig.axiosTimeout,
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            const response = await axios.post(`${sandboxUrl}?usuario=${encodeURIComponent(username)}`, {}, axiosConfig);

            console.log("Respuesta recibida:", response.data);

            return true;

        } catch (error) {
            console.error("Error al crear el workspace en TAMBOSANDBOX.sandbox.create:", error);
            return false;
        }
        
    }

    async destroyWorkspace() {

        try {

            const sandboxUrl = globalConfig.sandboxUrl + globalConfig.sandboxAPICreate;
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

            console.error("TAMBOSANDBOX.sandbox.destroy: ", error);
            return false;

        }

    }

    async commitWorkspace() {

    }

}