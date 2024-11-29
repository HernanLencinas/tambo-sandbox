import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';

export class GitLabAuth {
    private apiClient: AxiosInstance;
    private token: string | null = null;

    constructor(baseURL: string = 'https://gitlab.com/api/v4') {
        this.apiClient = axios.create({
            baseURL,
            timeout: 5000, // Tiempo límite para la solicitud
        });
    }

    /**
     * Autenticar un token contra la API de GitLab
     * @param token - Token personal de acceso de GitLab
     * @returns Información del usuario autenticado
     * @throws Error si la autenticación falla
     */
    async authenticate(token: string): Promise<any> {
        try {
            // Configurar el token para las solicitudes
            this.apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            // Verificar el token llamando al endpoint de usuario actual
            const response = await this.apiClient.get('/user');
            
            // Si la solicitud tiene éxito, guardar el token y devolver los datos
            this.token = token;
            return response.data; // Datos del usuario autenticado
        } catch (error: any) {
            if (error.response && error.response.status === 401) {
                throw new Error('Token no válido o expirado.');
            }
            throw new Error('Error al autenticar contra GitLab: ' + error.message);
        }
    }

    /**
     * Verificar si el token almacenado es válido
     * @returns true si el token es válido, false en caso contrario
     */
    async isAuthenticated(): Promise<boolean> {
        if (!this.token) {
            return false; // No hay token almacenado
        }

        try {
            const response = await this.apiClient.get('/user');
            return response.status === 200;
        } catch (error: any) {
            return false; // Token inválido
        }
    }

    /**
     * Limpiar el token actual
     */
    logout(): void {
        this.token = null;
        delete this.apiClient.defaults.headers.common['Authorization'];
    }

    /**
     * Obtener información del usuario autenticado
     * @returns Datos del usuario autenticado
     * @throws Error si no hay autenticación activa
     */
    async getAuthenticatedUser(): Promise<any> {
        if (!this.token) {
            throw new Error('No hay una sesión activa.');
        }

        try {
            const response = await this.apiClient.get('/user');
            return response.data;
        } catch (error: any) {
            throw new Error('Error al obtener datos del usuario: ' + error.message);
        }
    }
}
