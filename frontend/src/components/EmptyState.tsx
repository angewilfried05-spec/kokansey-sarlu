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
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-20 h-20 bg-gray-50 dark:bg-slate-700/50 rounded-2xl flex items-center justify-center mb-6 text-gray-300 dark:text-slate-500">
        <IconComponent className="w-10 h-10" />
      </div>
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-slate-400 font-medium max-w-sm mb-6">{description}</p>
      {onAdd && (
        <button onClick={onAdd} className="btn-primary">
          <Plus className="w-4 h-4" />
          {addButtonText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
