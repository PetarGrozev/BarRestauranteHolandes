"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const EditProduct = () => {
    const router = useRouter();
    const { id } = router.query;
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        image: '',
        orderDestination: 'kitchen',
    });

    useEffect(() => {
        if (id) {
            const fetchProduct = async () => {
                try {
                    const res = await fetch(`/api/products/${id}`);
                    if (!res.ok) throw new Error('Product fetch failed');
                    const data = await res.json();
                    setProduct(data);
                    setFormData({
                        name: data.name,
                        price: data.price,
                        image: data.imageUrl || '',
                        orderDestination: data.orderTarget.toLowerCase(),
                    });
                } catch (err) {
                    setError('Error fetching product');
                } finally {
                    setLoading(false);
                }
            };
            fetchProduct();
        }
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/products/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    price: parseFloat(formData.price),
                    image: formData.image,
                    orderDestination: formData.orderDestination,
                }),
            });
            if (!res.ok) throw new Error('Product update failed');
            router.push('/admin/products');
        } catch (err) {
            setError('Error updating product');
        }
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;

    return (
        <div>
            <h1>Edit Product</h1>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Name:</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div>
                    <label>Price:</label>
                    <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div>
                    <label>Image URL:</label>
                    <input
                        type="text"
                        name="image"
                        value={formData.image}
                        onChange={handleChange}
                    />
                </div>
                <div>
                    <label>Order Destination:</label>
                    <select
                        name="orderDestination"
                        value={formData.orderDestination}
                        onChange={handleChange}
                    >
                        <option value="kitchen">Kitchen</option>
                        <option value="staff">Staff</option>
                        <option value="both">Both</option>
                    </select>
                </div>
                <button type="submit">Update Product</button>
            </form>
        </div>
    );
};

export default EditProduct;