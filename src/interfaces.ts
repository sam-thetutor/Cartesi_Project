export interface Product {
    id: number;
    name: string;
    description:string;
    owner:string;
    price:number;
    instock:number;
}

export interface ProductPayload {
    id: number;
    name: string;
    description:string;
    owner:string;
    price:number;
    instock:number;
    action: 'add' | 'delete' | 'buy';
} 