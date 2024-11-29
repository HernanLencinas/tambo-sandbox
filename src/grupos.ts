import * as vscode from 'vscode';

export class GruposTreeProvider implements vscode.TreeDataProvider<GrupoItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<GrupoItem | undefined | void> = new vscode.EventEmitter<GrupoItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<GrupoItem | undefined | void> = this._onDidChangeTreeData.event;

    private grupos: { name: string; repositorio: string; branch: string }[] = [
        { name: "Frame", repositorio: "repo-frame", branch: "main" },
        { name: "Acceso Fijo", repositorio: "repo-acceso-fijo", branch: "develop" },
        { name: "Acceso Móvil", repositorio: "repo-acceso-movil", branch: "main" },
        { name: "Transporte", repositorio: "repo-transporte", branch: "release" },
        { name: "PMC", repositorio: "repo-pmc", branch: "feature" },
        { name: "IM", repositorio: "repo-im", branch: "hotfix" },
        { name: "Servicios", repositorio: "repo-servicios", branch: "main" },
        { name: "Inventario", repositorio: "repo-inventario", branch: "develop" },
        { name: "Data", repositorio: "repo-data", branch: "main" },
        { name: "Gnoc", repositorio: "repo-gnoc", branch: "release" },
        { name: "Conectividad Hogar", repositorio: "repo-conectividad", branch: "main" },
        { name: "Soporte Proactivo", repositorio: "repo-soporte", branch: "develop" },
        { name: "Tte Acceso Fijo", repositorio: "repo-tte-fijo", branch: "main" },
        { name: "Tte Agregación", repositorio: "repo-tte-agregacion", branch: "develop" },
        { name: "Tte DC y Serv", repositorio: "repo-tte-dc", branch: "main" },
        { name: "Tte Redes Ópticas", repositorio: "repo-tte-opticas", branch: "release" },
        { name: "Gsoc", repositorio: "repo-gsoc", branch: "main" },
        { name: "Demo", repositorio: "repo-demo", branch: "develop" }
    ];

    constructor(private context: vscode.ExtensionContext) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: GrupoItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: GrupoItem): Thenable<GrupoItem[]> {
        if (element) {
            return Promise.resolve([]);
        } else {
            return Promise.resolve(
                this.grupos.map(grupo => new GrupoItem(grupo.name, grupo.repositorio, grupo.branch, this.context))
            );
        }
    }
}

export class GrupoItem extends vscode.TreeItem {
    constructor(
        public readonly name: string,
        public readonly repositorio: string,
        public readonly branch: string,
        private context: vscode.ExtensionContext
    ) {
        super(name, vscode.TreeItemCollapsibleState.None);
        this.tooltip = `Repositorio: ${repositorio} | Branch: ${branch}`;
        this.description = branch;

        // Asociar un comando al elemento
        this.command = {
            title: 'Seleccionar Grupo',
            command: 'tambo.grupos.select',
            arguments: [this] // Pasar el elemento seleccionado al comando
        };

        // Usar rutas absolutas para los iconos
        this.iconPath = {
            light: this.context.asAbsolutePath('resources/icons/file_light.svg'),
            dark: this.context.asAbsolutePath('resources/icons/file_dark.svg')
        };
    }
}
