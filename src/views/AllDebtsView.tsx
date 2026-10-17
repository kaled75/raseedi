import React from 'react';
import { DebtsViewBase } from './DebtsViewBase';
import { Debt } from '../types';

interface AllDebtsViewProps {
  refreshTrigger?: number;
  searchQuery?: string;
  onOpenNewDebt: () => void;
  onRecordPayment: (debtId: string) => void;
  onEditDebt: (debt: Debt) => void;
  onDataChange?: () => void;
}

export const AllDebtsView: React.FC<AllDebtsViewProps> = (props) => {
  return (
    <DebtsViewBase
      title="سجل جميع الديون والمعاملات"
      subtitle="عرض شامل لكافة الديون (المستحقة لك والمستحقة عليك) مع خيارات البحث والفرز المتقدم"
      {...props}
    />
  );
};
