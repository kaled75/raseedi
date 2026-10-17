import React from 'react';
import { DebtsViewBase } from './DebtsViewBase';
import { Debt } from '../types';

interface DebtsOnMeViewProps {
  refreshTrigger?: number;
  searchQuery?: string;
  onOpenNewDebt: () => void;
  onRecordPayment: (debtId: string) => void;
  onEditDebt: (debt: Debt) => void;
  onDataChange?: () => void;
}

export const DebtsOnMeView: React.FC<DebtsOnMeViewProps> = (props) => {
  return (
    <DebtsViewBase
      fixedType="on_me"
      title="الديون المستحقة عليّ (أموال اقترضتها من الآخرين)"
      subtitle="متابعة الالتزامات المالية الواجب سدادها للأصدقاء والأقارب وتسجيل الدفعات"
      {...props}
    />
  );
};
