import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();

  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
    return <div>Access Denied</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      {/* Product Management */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Product Management</h2>
        {/* Product CRUD interface */}
      </section>

      {/* Order Management */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Order Management</h2>
        {/* Order management interface */}
      </section>

      {/* Category Management */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Category Management</h2>
        {/* Category management interface */}
      </section>

      {/* Analytics */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Analytics</h2>
        {/* Analytics dashboard */}
      </section>
    </div>
  );
};

export default AdminDashboard;
