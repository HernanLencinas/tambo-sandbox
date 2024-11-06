import * as vscode from 'vscode';
import { ConnectionType } from './models';

export class Connection {

    async wizard() {

        const gitlabUsername = await vscode.window.showInputBox({
            prompt: 'Usuario de Gitlab: ',
            placeHolder: ''
        });
        const gitlabToken = await vscode.window.showInputBox({
            prompt: 'Token de Gitlab: ',
            placeHolder: '',
            password: true
        });

        if (gitlabUsername && gitlabToken) {

            // Obtén la configuración actual
            const configuration = vscode.workspace.getConfiguration('tambo.sandbox.config');
            const connection: ConnectionType[] = configuration.get('gitlab', []);

            // Agrega el nuevo entorno a la configuración
            connection.push({
                gitlabUsername,
                gitlabToken,
            });

            // Actualiza la configuración con los nuevos valores
            await configuration.update('gitlab', connection, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`TAMBO: Se configuro la conexion a Sandbox`);

        }
        /*         const gitlabUsername = vscode.window.showInputBox({
                    prompt: 'Ingrese su nombre de usuario de GitLab: ',
                    placeHolder: ''
                });
        
                const gitlabToken = vscode.window.showInputBox({
                    prompt: 'Ingrese su token de acceso de GitLab: ',
                    placeHolder: '',
                    password: true
                }); */



    }


}
