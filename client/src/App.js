import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Cart from "./pages/Cart";
import { AuthProvider } from "./context/AuthContext";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProducts from "./pages/AdminProducts";
import AdminProductCreate from "./pages/AdminProductCreate";
import AdminProductEdit from "./pages/AdminProductEdit";
import AdminOrders from "./pages/AdminOrders";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import Orders from "./pages/Orders";
import { useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";

// Admin route wrapper component
function AdminRoute({ children }) {
  const { user, isAdmin } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!isAdmin()) {
    return <Navigate to="/" />;
  }

  return children;
}

// User route wrapper component
function UserRoute({ children }) {
  const { user, isAdmin } = useAuth();
  console.log("user", user);
  console.log("isAdmin", isAdmin());
  if (!user) {
    return <Navigate to="/login" />;
  }

  if (isAdmin()) {
    return <Navigate to="/admin" />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>

        <BrowserRouter>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* User routes */}
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route
                path="/checkout"
                element={
                  <UserRoute>
                    <Checkout />
                  </UserRoute>
                }
              />
              <Route path="/order-success" element={<OrderSuccess />} />
              <Route
                path="/orders"
                element={
                  <UserRoute>
                    <Orders />
                  </UserRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <UserRoute>
                    <Dashboard />
                  </UserRoute>
                }
              />
              
              {/* Admin routes */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                      <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/products"
                element={
                  <AdminRoute>
                      <AdminProducts />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/products/new"
                element={
                  <AdminRoute>
                      <AdminProductCreate />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/products/edit/:id"
                element={
                  <AdminRoute>
                      <AdminProductEdit />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/orders"
                element={
                  <AdminRoute>
                      <AdminOrders />
                  </AdminRoute>
                }
              />
            </Routes>
          </div>
        </BrowserRouter>
      </CartProvider> 
    </AuthProvider>
  );
}

export default App;
