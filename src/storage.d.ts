
export  interface StorageUtilStatic {
    serializeValue(value: any): string;

    unSerializeValue(value: string): any;

    sessionSet(key: string, value: any): boolean;

    sessionGet(key: string): any;

    sessionRemove(key: string): boolean;

    sessionClear(): boolean;

    localSet(key: string, value: any): boolean;

    localGet(key: string): any;

    localRemove(key: string): boolean;

    localClear(): boolean;
    setClientSource(): void;

    getClientSource(): string;

    removeClientSource(): boolean;

    saveAuthInfo(user: object, token: object): void;

    clearAuthInfo(): void;

    getAuthUser(key?: string, defaultValue?: any): any;

    getAuthToken(key?: string, defaultValue?: any): any;
}
export const StorageUtil:StorageUtilStatic
export default StorageUtil