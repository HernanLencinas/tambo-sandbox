import * as vscode from 'vscode';

export type Repository = {
    name: string;
    path: string;
    repoid: string;
    commit: boolean;
};

export const globalConfig = {
    sandboxUrl: 'https://backend-sandbox.dev.apps.automation.teco.com.ar' as string,
    sandboxAPIStatus: '/status' as string,
    sandboxAPISandbox: '/sandbox' as string,
    gitlabUrl: 'https://gitlab.com' as string,
    gitlabAPIUser: '/api/v4/user' as string,
    sandboxState: undefined as number | undefined,
    vscodeUri: undefined as vscode.Uri | undefined,
    workspaceStatus: 1 as number,
    workspaceStatusHash: undefined as string | undefined,
    workspaceRepositories: undefined as any | undefined,
    workspaceRepository: undefined as Repository | undefined, 
    axiosTimeout: 30000 as number
};
