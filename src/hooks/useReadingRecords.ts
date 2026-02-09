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
    saveRecords([...records, newRecord]);
    return newRecord;
  }, [records, saveRecords]);

  // 删除记录
  const deleteRecord = useCallback((id: string) => {
    saveRecords(records.filter(r => r.id !== id));
  }, [records, saveRecords]);

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
    deleteRecord,
    getCountryData,
    getVisitedCountries,
    getStats,
  };
}
