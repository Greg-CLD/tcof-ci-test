import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

interface PlanContextType {
  selectedPlanId: string | null;
  setSelectedPlanId: (id: string | null) => void;
}

const PlanContext = createContext<PlanContextType | null>(null);

interface PlanProviderProps {
  children: ReactNode;
}

export const PlanProvider: React.FC<PlanProviderProps> = ({ children }) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Load the selected plan ID from localStorage on initial render
  useEffect(() => {
    const storedProjectId = localStorage.getItem('selectedProjectId');
    if (storedProjectId) {
      setSelectedPlanId(storedProjectId);
    }
  }, []);

  // Update localStorage when selectedPlanId changes
  useEffect(() => {
    if (selectedPlanId) {
      localStorage.setItem('selectedProjectId', selectedPlanId);
    }
  }, [selectedPlanId]);

  return (
    <PlanContext.Provider value={{ selectedPlanId, setSelectedPlanId }}>
      {children}
    </PlanContext.Provider>
  );
};

export const usePlan = (): PlanContextType => {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
};