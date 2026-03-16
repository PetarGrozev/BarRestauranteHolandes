"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CreateProduct = () => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState('');
  const [orderDestination, setOrderDestination] = useState('kitchen');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          price: parseFloat(price),
          image,
          orderDestination,
        }),
      });
      if (!res.ok) throw new Error('Create product failed');
      router.push('/admin/products');
    } catch (error) {
      console.error('Error creating product:', error);
    }
  };

    return (
        <div>
            <h1>Create New Product</h1>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Product Name:</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Price:</label>
                    <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Image URL:</label>
                    <input
                        type="text"
                        value={image}
                        onChange={(e) => setImage(e.target.value)}
                    />
                </div>
                <div>
                    <label>Order Destination:</label>
                    <select
                        value={orderDestination}
                        onChange={(e) => setOrderDestination(e.target.value)}
                    >
                        <option value="kitchen">Kitchen</option>
                        <option value="staff">Staff</option>
                        <option value="both">Both</option>
                    </select>
                </div>
                <button type="submit">Create Product</button>
            </form>
        </div>
    );
};

export default CreateProduct;