import React from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AdminLayout({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link to="/admin" className="text-2xl font-bold text-blue-600">
                Admin Panel
              </Link>
              <Link
                to="/admin/products"
                className={`${
                  location.pathname.includes('/admin/products')
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                Products
              </Link>
              <Link
                to="/admin/categories"
                className={`${
                  location.pathname.includes('/admin/categories')
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                Categories
              </Link>
              <Link
                to="/admin/users"
                className={`${
                  location.pathname.includes('/admin/users')
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                Users
              </Link>
              <Link
                to="/admin/orders"
                className={`${
                  location.pathname.includes('/admin/orders')
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                Orders
              </Link>
            </div>
            <Link to="/" className="text-gray-600 hover:text-blue-600">
              Back to Site
            </Link>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

export default AdminLayout;
