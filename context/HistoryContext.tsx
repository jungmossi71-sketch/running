import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RunRecord {
  id: string;
  date: string;
  title: string;
  distance: string;
  pace: string;
  time: string;
  route: {latitude: number, longitude: number}[];
}

interface HistoryContextType {
  history: RunRecord[];
  weeklyGoal: number;
  mileageBalance: number;
  addRun: (run: Omit<RunRecord, 'id'>) => Promise<void>;
  clearHistory: () => Promise<void>;
  deleteRun: (id: string) => Promise<void>;
  updateWeeklyGoal: (goal: number) => Promise<void>;
  spendMileage: (amount: number) => Promise<boolean>;
}

const HistoryContext = createContext<HistoryContextType>({
  history: [],
  weeklyGoal: 40.0,
  mileageBalance: 50.0, // 초기 장려금 50M 지급
  addRun: async () => {},
  clearHistory: async () => {},
  deleteRun: async () => {},
  updateWeeklyGoal: async () => {},
  spendMileage: async () => false,
});

export const HistoryProvider = ({ children }: { children: React.ReactNode }) => {
  const [history, setHistory] = useState<RunRecord[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState<number>(40.0);
  const [mileageBalance, setMileageBalance] = useState<number>(50.0);

  useEffect(() => {
    AsyncStorage.getItem('run_history').then((data) => {
      if (data) setHistory(JSON.parse(data));
    });
    AsyncStorage.getItem('run_weekly_goal').then((data) => {
      if (data) setWeeklyGoal(parseFloat(data));
    });
    AsyncStorage.getItem('run_mileage_balance').then((data) => {
      if (data) setMileageBalance(parseFloat(data));
    });
  }, []);

  const updateWeeklyGoal = async (goal: number) => {
    setWeeklyGoal(goal);
    await AsyncStorage.setItem('run_weekly_goal', goal.toString());
  };

  const addRun = async (run: Omit<RunRecord, 'id'>) => {
    const newRun = { ...run, id: Date.now().toString() };
    const newHistory = [newRun, ...history];
    setHistory(newHistory);
    await AsyncStorage.setItem('run_history', JSON.stringify(newHistory));
    
    // GPS 오차를 제외한 실제 거리 마일리지를 누적 (소수점 1자리)
    const distNum = parseFloat(run.distance) || 0;
    const newBalance = mileageBalance + distNum;
    setMileageBalance(newBalance);
    await AsyncStorage.setItem('run_mileage_balance', newBalance.toString());
  };

  const spendMileage = async (amount: number) => {
    if (mileageBalance >= amount) {
      const newBalance = mileageBalance - amount;
      setMileageBalance(newBalance);
      await AsyncStorage.setItem('run_mileage_balance', newBalance.toString());
      return true;
    }
    return false;
  };

  const clearHistory = async () => {
    setHistory([]);
    await AsyncStorage.removeItem('run_history');
  };

  const deleteRun = async (id: string) => {
    const newHistory = history.filter(run => run.id !== id);
    setHistory(newHistory);
    await AsyncStorage.setItem('run_history', JSON.stringify(newHistory));
  };

  return (
    <HistoryContext.Provider value={{ history, weeklyGoal, mileageBalance, addRun, clearHistory, deleteRun, updateWeeklyGoal, spendMileage }}>
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistoryContext = () => useContext(HistoryContext);
