import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CartIcon from './CartIcon';

function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-2xl font-bold text-blue-600">
            Fashion Store
          </Link>

          <div className="flex items-center space-x-8">
            {/* Public Links */}
            {!isAdmin() && (
              <Link to="/products" className="text-gray-600 hover:text-blue-600">
                Products
              </Link>
            )}
            
            {/* Authenticated User Links */}
            {user ? (
              <>
                {isAdmin() ? (
                  /* Admin Links */
                  <div className="flex items-center space-x-6">
                    <Link to="/admin" className="text-gray-600 hover:text-blue-600">
                      Admin Dashboard
                    </Link>
                    <Link to="/admin/products" className="text-gray-600 hover:text-blue-600">
                      Products
                    </Link>
                    <Link to="/admin/orders" className="text-gray-600 hover:text-blue-600">
                      Orders
                    </Link>
                  </div>
                ) : (
                  /* Regular User Links */
                  <div className="flex items-center space-x-6">
                    <Link to="/dashboard" className="text-gray-600 hover:text-blue-600">
                      Dashboard
                    </Link>
                    <Link to="/orders" className="text-gray-600 hover:text-blue-600">
                      My Orders
                    </Link>
                    <CartIcon />
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-blue-600 ml-6"
                >
                  Logout
                </button>
              </>
            ) : (
              /* Unauthenticated User Links */
              <div className="flex items-center space-x-4">
                <Link to="/login" className="text-gray-600 hover:text-blue-600">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition duration-300"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;