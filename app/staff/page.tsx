"use client";

import LiveNotifications from '@/components/LiveNotifications';
import OrderTile from '@/components/OrderTile';
import useOrders from '@/hooks/useOrders';

const StaffPage = () => {
    const { orders, markAsSoldOut } = useOrders();

    return (
        <div>
            <h1>Staff Orders</h1>
            <LiveNotifications />
            <div>
                {orders.map(order => (
                    <OrderTile 
                        key={order.id} 
                        order={order} 
                        onSoldOut={() => markAsSoldOut(order.id)} 
                    />
                ))}
            </div>
        </div>
    );
};

export default StaffPage;