import React from 'react';
import { DebtsViewBase } from './DebtsViewBase';
import { Debt } from '../types';

interface DebtsForMeViewProps {
  refreshTrigger?: number;
  searchQuery?: string;
  onOpenNewDebt: () => void;
  onRecordPayment: (debtId: string) => void;
  onEditDebt: (debt: Debt) => void;
  onDataChange?: () => void;
}

export const DebtsForMeView: React.FC<DebtsForMeViewProps> = (props) => {
  return (
    <DebtsViewBase
      fixedType="for_me"
      title="الديون المستحقة لي (أموال أقرضتها للآخرين)"
      subtitle="متابعة الأموال التي أقرضتها للأصدقاء والأقارب وتتبع استلام دفعات السداد"
      {...props}
    />
  );
};
