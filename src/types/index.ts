export interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    orderDestination: 'kitchen' | 'staff' | 'both';
}

export interface Order {
    id: string;
    products: Product[];
    totalPrice: number;
    status: 'pending' | 'in_progress' | 'completed';
    createdAt: Date;
}

export interface Admin {
    id: string;
    email: string;
}

export interface Staff {
    id: string;
    name: string;
}

export interface HoldTimer {
    duration: number; // in minutes
    startTime: Date;
}