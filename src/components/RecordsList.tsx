import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, MapPin, Calendar, Trash2, User, Tag } from 'lucide-react';
import { ReadingRecord, getCountryName } from '@/types/reading';

interface RecordsListProps {
  isOpen: boolean;
  onClose: () => void;
  records: ReadingRecord[];
  onDelete: (id: string) => void;
  filterCountryCode?: string; // 可选的过滤国家代码
}

export const RecordsList: React.FC<RecordsListProps> = ({
  isOpen,
  onClose,
  records,
  onDelete,
  filterCountryCode,
}) => {
  // 如果指定了过滤国家，只显示该国家的记录
  const filteredRecords = filterCountryCode
    ? records.filter(record => record.book.countryCode.toUpperCase() === filterCountryCode.toUpperCase())
    : records;

  // 按国家分组
  const groupedRecords = filteredRecords.reduce((acc, record) => {
    const code = record.book.countryCode.toUpperCase();
    if (!acc[code]) {
      acc[code] = [];
    }
    acc[code].push(record);
    return acc;
  }, {} as Record<string, ReadingRecord[]>);

  const sortedCountries = Object.keys(groupedRecords).sort((a, b) => {
    return groupedRecords[b].length - groupedRecords[a].length;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          
          {/* 面板 */}
          <motion.div
            initial={{ opacity: 0, x: '-100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full w-full max-w-md bg-card border-r border-border shadow-elevated z-50 overflow-hidden flex flex-col"
          >
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-medium text-foreground">
                    {filterCountryCode ? getCountryName(filterCountryCode) : '我的阅读足迹'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {filterCountryCode 
                      ? `${filteredRecords.length} 本书`
                      : `共 ${records.length} 本书 · ${sortedCountries.length} 个国家`
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="btn-icon"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto scrollbar-elegant">
              {filteredRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full px-6">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                    <BookOpen className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-serif text-foreground mb-2">还没有阅读记录</p>
                  <p className="text-sm text-muted-foreground text-center">
                    点击右下角的"记录足迹"按钮<br />开始记录你的阅读之旅吧！
                  </p>
                </div>
              ) : (
                <div className="py-4">
                  {sortedCountries.map((countryCode, index) => (
                    <motion.div
                      key={countryCode}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="mb-4"
                    >
                      {/* 国家标题 - 只在显示多个国家时显示 */}
                      {!filterCountryCode && sortedCountries.length > 1 && (
                        <div className="flex items-center gap-2 px-6 py-2 bg-muted/50">
                          <span className="text-lg">{getCountryFlag(countryCode)}</span>
                          <span className="font-medium text-foreground">
                            {getCountryName(countryCode)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ({groupedRecords[countryCode].length} 本)
                          </span>
                        </div>
                      )}

                      {/* 书籍列表 */}
                      <div className={filterCountryCode ? "px-6" : "px-4"}>
                        {groupedRecords[countryCode].map((record) => (
                          <div
                            key={record.id}
                            className="warm-card mx-2 my-2 p-4"
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex-1 min-w-0">
                                {/* 书名 */}
                                <h3 className="font-serif font-medium text-foreground truncate">
                                  {record.book.title}
                                </h3>
                                
                                {/* 作者 */}
                                <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                                  <User className="w-3.5 h-3.5" />
                                  <span>{record.book.author}</span>
                                </div>

                                {/* 类型 */}
                                {record.book.genre && (
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className="tag text-xs">{record.book.genre}</span>
                                  </div>
                                )}

                                {/* 阅读时间 */}
                                {(record.startDate || record.endDate) && (
                                  <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>
                                      {record.startDate && formatDate(record.startDate)}
                                      {record.startDate && record.endDate && ' - '}
                                      {record.endDate && formatDate(record.endDate)}
                                    </span>
                                  </div>
                                )}

                                {/* 短评 */}
                                {record.review && (
                                  <p className="mt-2 text-sm text-muted-foreground italic line-clamp-2">
                                    "{record.review}"
                                  </p>
                                )}
                              </div>

                              {/* 删除按钮 */}
                              <button
                                onClick={() => onDelete(record.id)}
                                className="btn-icon text-muted-foreground hover:text-destructive flex-shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

function getCountryFlag(code: string): string {
  const codePoints = code
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

export default RecordsList;
