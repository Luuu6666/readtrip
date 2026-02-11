import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, MapPin, Calendar, Trash2, User, Tag } from 'lucide-react';
import { ReadingRecord, getCountryName } from '@/types/reading';
import { getLocalCoverUrl } from '@/lib/bookCovers';

interface BookDetailCardProps {
  isOpen: boolean;
  onClose: () => void;
  record: ReadingRecord | null;
  onDelete: (id: string) => void;
}

export const BookDetailCard: React.FC<BookDetailCardProps> = ({
  isOpen,
  onClose,
  record,
  onDelete,
}) => {
  if (!record) return null;

  const handleDelete = () => {
    if (confirm('确定要删除这条阅读记录吗？')) {
      onDelete(record.id);
      onClose();
    }
  };

  // 获取封面URL
  const getCoverUrl = () => {
    if (record.book.coverUrl && record.book.coverUrl.trim()) {
      if (record.book.coverUrl.startsWith('/') || record.book.coverUrl.startsWith('data:')) {
        return record.book.coverUrl;
      }
      try {
        new URL(record.book.coverUrl);
        return record.book.coverUrl;
      } catch {
        // URL无效，继续查找其他封面
      }
    }
    
    const localCover = getLocalCoverUrl(record.book.title);
    if (localCover) {
      return localCover;
    }
    
    return '/book-covers/logo.png';
  };

  const coverUrl = getCoverUrl();

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

  return (
    <AnimatePresence>
      {isOpen && record && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          
          {/* 卡片 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full max-w-lg glass-panel rounded-2xl border border-border/50 shadow-elevated overflow-hidden pointer-events-auto">
              {/* 头部 */}
              <div className="relative h-64 bg-gradient-to-br from-primary/10 to-primary/5">
                {/* 书籍封面 */}
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <img
                    src={coverUrl}
                    alt={record.book.title}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/book-covers/logo.png';
                    }}
                  />
                </div>
                
                {/* 关闭按钮 */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 btn-icon glass-panel"
                  aria-label="关闭详情"
                >
                  <X className="w-5 h-5" aria-hidden />
                </button>
              </div>

              {/* 内容区 */}
              <div className="p-6 space-y-4">
                {/* 书名 */}
                <div>
                  <h2 className="font-serif text-2xl font-semibold text-foreground mb-2">
                    {record.book.title}
                  </h2>
                  
                  {/* 作者 */}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="w-4 h-4" aria-hidden />
                    <span>{record.book.author}</span>
                  </div>
                </div>

                {/* 作者国籍 */}
                <div className="flex items-center gap-2 text-muted-foreground" title="作者国籍">
                  <MapPin className="w-4 h-4" aria-hidden />
                  <span className="text-lg">{getCountryFlag(record.book.countryCode)}</span>
                  <span>{getCountryName(record.book.countryCode)}</span>
                </div>

                {/* 类型 */}
                {record.book.genre && (
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-muted-foreground" aria-hidden />
                    <span className="tag">{record.book.genre}</span>
                  </div>
                )}

                {/* 阅读时间 */}
                {(record.startDate || record.endDate) && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" aria-hidden />
                    <span>
                      {record.startDate && formatDate(record.startDate)}
                      {record.startDate && record.endDate && ' - '}
                      {record.endDate && formatDate(record.endDate)}
                    </span>
                  </div>
                )}

                {/* 短评 */}
                {record.review && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-2">阅读笔记</p>
                    <p className="text-foreground italic leading-relaxed">
                      "{record.review}"
                    </p>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                  <button
                    onClick={handleDelete}
                    className="btn-ghost text-destructive hover:bg-destructive/10"
                    aria-label="删除此条阅读记录"
                  >
                    <Trash2 className="w-4 h-4 mr-2" aria-hidden />
                    删除记录
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
