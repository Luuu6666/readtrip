import { useState, useEffect, useCallback } from 'react';
import { ReadingRecord, CountryData } from '@/types/reading';

const STORAGE_KEY = 'readtrip_records';

export function useReadingRecords() {
  const [records, setRecords] = useState<ReadingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 从 localStorage 加载数据
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRecords(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load reading records:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 保存数据到 localStorage
  const saveRecords = useCallback((newRecords: ReadingRecord[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newRecords));
      setRecords(newRecords);
    } catch (error) {
      console.error('Failed to save reading records:', error);
    }
  }, []);

  // 添加记录
  const addRecord = useCallback((record: Omit<ReadingRecord, 'id' | 'createdAt'>) => {
    const newRecord: ReadingRecord = {
      ...record,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    // 使用函数式更新确保基于最新状态
    setRecords(prevRecords => {
      const updated = [...prevRecords, newRecord];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        console.log('保存记录成功，当前总数:', updated.length);
      } catch (error) {
        console.error('Failed to save reading records:', error);
      }
      return updated;
    });
    return newRecord;
  }, []);
  
  // 批量添加记录
  const addRecords = useCallback((newRecords: Array<Omit<ReadingRecord, 'id' | 'createdAt'>>) => {
    console.log('addRecords 被调用，准备添加:', newRecords.length, '条记录');
    const recordsWithIds: ReadingRecord[] = newRecords.map(record => ({
      ...record,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }));
    
    // 验证数据格式
    recordsWithIds.forEach((record, index) => {
      if (!record.book || !record.book.title || !record.book.countryCode) {
        console.error(`第 ${index + 1} 条记录格式错误:`, record);
      }
    });
    
    // 使用函数式更新确保基于最新状态
    setRecords(prevRecords => {
      const updated = [...prevRecords, ...recordsWithIds];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        console.log('批量保存成功，总记录数:', updated.length);
        console.log('保存的数据示例:', updated.slice(0, 2));
      } catch (error) {
        console.error('Failed to save reading records:', error);
      }
      return updated;
    });
    return recordsWithIds;
  }, []);

  // 删除记录
  const deleteRecord = useCallback((id: string) => {
    saveRecords(records.filter(r => r.id !== id));
  }, [records, saveRecords]);

  // 更新记录
  const updateRecord = useCallback((id: string, updates: Partial<ReadingRecord>) => {
    setRecords(prevRecords => {
      const updated = prevRecords.map(record => 
        record.id === id ? { ...record, ...updates } : record
      );
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save reading records:', error);
      }
      return updated;
    });
  }, []);

  // 清除所有记录
  const clearAllRecords = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setRecords([]);
      console.log('已清除所有阅读记录');
    } catch (error) {
      console.error('Failed to clear reading records:', error);
    }
  }, []);

  // 获取按国家分组的数据
  const getCountryData = useCallback((): CountryData[] => {
    const countryMap = new Map<string, CountryData>();
    
    records.forEach(record => {
      const code = record.book.countryCode.toUpperCase();
      if (!countryMap.has(code)) {
        countryMap.set(code, {
          code,
          name: record.book.country,
          nameCn: record.book.country,
          books: [],
        });
      }
      countryMap.get(code)!.books.push(record);
    });

    return Array.from(countryMap.values());
  }, [records]);

  // 获取已访问的国家代码列表
  const getVisitedCountries = useCallback((): string[] => {
    return [...new Set(records.map(r => r.book.countryCode.toUpperCase()))];
  }, [records]);

  // 获取统计数据
  const getStats = useCallback(() => {
    const countries = getVisitedCountries();
    return {
      totalBooks: records.length,
      totalCountries: countries.length,
      countries,
    };
  }, [records, getVisitedCountries]);

  return {
    records,
    isLoading,
    addRecord,
    addRecords,
    deleteRecord,
    updateRecord,
    clearAllRecords,
    getCountryData,
    getVisitedCountries,
    getStats,
  };
}
