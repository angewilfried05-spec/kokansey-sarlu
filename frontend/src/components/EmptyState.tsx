import React from 'react';
import { Plus, Sprout, Users, Truck, Package, FileText } from 'lucide-react';

interface EmptyStateProps {
  icon: 'cultures' | 'employees' | 'trucks' | 'stock' | 'reports' | 'harvests' | 'sales' | 'expenses' | 'operations';
  title: string;
  description: string;
  onAdd?: () => void;
  addButtonText?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  onAdd,
  addButtonText = "Ajouter"
}) => {
  const IconComponent = {
    cultures: Sprout,
    employees: Users,
    trucks: Truck,
    stock: Package,
    reports: FileText,
    harvests: Sprout,
    sales: Package,
    expenses: FileText,
    operations: Package
  }[icon];

  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div className="w-24 h-24 bg-gray-50 rounded-3xl flex items-center justify-center mb-8 text-gray-300">
        <IconComponent className="w-12 h-12" />
      </div>
      <h3 className="text-2xl font-black text-gray-800 mb-3">{title}</h3>
      <p className="text-gray-500 font-medium max-w-sm mb-8">{description}</p>
      {onAdd && (
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          {addButtonText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
