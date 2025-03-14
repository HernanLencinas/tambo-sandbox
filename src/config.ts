import * as vscode from 'vscode';

export class VSCESetttings {

    async getAutoPush(): Promise<boolean> {
        const config = vscode.workspace.getConfiguration("tambo.sandbox");
        return config.get("push", true);
    }

    async setAutoPush(value: boolean): Promise<void> {
        const config = vscode.workspace.getConfiguration("tambo.sandbox");
        await config.update("push", value, vscode.ConfigurationTarget.Global);
    }

}
