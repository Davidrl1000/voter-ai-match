import { ReactNode } from 'react';

interface InfoBlockProps {
  title: string;
  children: ReactNode;
  variant?: 'default' | 'highlighted';
}

export default function InfoBlock({ title, children, variant = 'default' }: InfoBlockProps) {
  const variantClasses = {
    default: 'bg-gradient-to-br from-gray-50 to-white border border-gray-200',
    highlighted: 'bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200',
  };

  return (
    <div className={`rounded-xl p-6 sm:p-8 mb-6 ${variantClasses[variant]}`}>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        {title}
      </h2>
      <div className="text-gray-700">
        {children}
      </div>
    </div>
  );
}
