import * as vscode from 'vscode';
import { Sandbox } from './sandbox';

export class GruposTreeProvider implements vscode.TreeDataProvider<GrupoItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<GrupoItem | undefined | void> = new vscode.EventEmitter<GrupoItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<GrupoItem | undefined | void> = this._onDidChangeTreeData.event;

    private sandbox: Sandbox;

    constructor(private context: vscode.ExtensionContext) {
        this.sandbox = new Sandbox();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: GrupoItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: GrupoItem): Promise<GrupoItem[]> {

        if (element) {

            return Promise.resolve([]);
        
        } else {
        
            try {

                //const response = await this.sandbox.statusWorkspace();
                const sandbox = new Sandbox();
                const response = await sandbox.statusWorkspace();
                console.log("TAMBOSANDBOX response:", response);

                if (!response || !response.data || !response.data.repos_disponibles || !Array.isArray(response.data.repos_disponibles)) {
                    vscode.window.showErrorMessage('No se pudo obtener la lista de grupos desde el servidor.');
                    return [];
                }

                return response.data.repos_disponibles.map((repo: any) => new GrupoItem(
                    repo.id.toString(),
                    repo.path,
                    this.context
                ));

            } catch (error) {
                vscode.window.showErrorMessage('Error al obtener los grupos: ' + error);
                return [];
            }
        }
    }
}

export class GrupoItem extends vscode.TreeItem {
    constructor(
        public readonly id: string,
        public readonly path: string,
        private context: vscode.ExtensionContext
    ) {
        super(path, vscode.TreeItemCollapsibleState.None);
        this.tooltip = `ID: ${id} | Path: ${path}`;
        this.description = id;

        this.command = {
            title: 'Seleccionar Grupo',
            command: 'tambo.grupos.select',
            arguments: [this]
        };

        this.iconPath = {
            light: this.context.asAbsolutePath('resources/icons/git_light.svg'),
            dark: this.context.asAbsolutePath('resources/icons/git_dark.svg')
        };
    }
}
