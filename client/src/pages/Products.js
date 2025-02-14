// src/pages/Products.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/products');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      // Debug log to see the structure
      console.log('API Response:', data);
      
      // Check if data is paginated
      const productsArray = data.products || data;
      if (!Array.isArray(productsArray)) {
        throw new Error('Invalid data format received');
      }
      
      setProducts(productsArray);
    } catch (error) {
      setError('Error loading products');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">{error}</div>;
  }

  if (!products.length) {
    return <div className="text-center py-8">No products available</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Our Products</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <Link 
            key={product.id} 
            to={`/products/${product.id}`}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
          >
            {product.images && (
              <div className="aspect-w-1 aspect-h-1 w-full">
                <img
                  src={`http://localhost:5000/api/products/images/${product.images.split(',')[0]}`}
                  alt={product.name}
                  className="w-full h-64 object-cover"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/400x400?text=No+Image';
                  }}
                />
              </div>
            )}
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-2">{product.name}</h2>
              <p className="text-gray-600 mb-2">{product.category_name}</p>
              <p className="text-xl font-bold text-blue-600">${product.price}</p>
              <p className="text-sm text-gray-500 mt-2">
                {product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Products;