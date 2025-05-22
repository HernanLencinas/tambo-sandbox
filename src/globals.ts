import * as vscode from 'vscode';

export type Repository = {
    name: string;
    path: string;
    branch: string;
    repoid: string;
    commit: boolean;
    fechaCreacion: string;
};



export const globalConfig = {
    sandboxUrl: 'https://backend.sandbox.automation.teco.com.ar' as string, // DEV: https://backend-sandbox.dev.apps.automation.teco.com.ar PLAY: https://backend.sandbox.automation.teco.com.ar
    sandboxAPIStatus: '/status' as string,
    sandboxAPISandbox: '/sandbox' as string,
    gitlabProtocol: "https://" as string,
    gitlabUrl: 'gitlab.com' as string,
    gitlabAPIUser: '/api/v4/user' as string,
    sandboxState: undefined as number | undefined,
    vscodeUri: undefined as vscode.Uri | undefined,
    workspaceStatus: 1 as number,
    workspaceStatusHash: undefined as string | undefined,
    workspaceRepositories: undefined as any | undefined,
    workspaceRepository: undefined as Repository | undefined,
    axiosTimeout: 30000 as number,
    contextConfigStatus: false as boolean,
    iTicketUrl: 'https://telecomarg-dwp.onbmc.com/dwp/app/#/itemprofile/3110' as string,
    automationUrl: 'https://automation.telecom.com.ar' as string
};
