import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Loader2, BookOpen, MapPin, User, Tag, Calendar, MessageSquare, Sparkles, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AIBookMatch, BookInfo } from '@/types/reading';
import { toast } from 'sonner';
import { getLocalCoverUrl } from '@/lib/bookCovers';

interface BookInputPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (book: BookInfo, startDate?: string, endDate?: string, review?: string) => void;
}

export const BookInputPanel: React.FC<BookInputPanelProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [bookTitle, setBookTitle] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const [matchedBook, setMatchedBook] = useState<AIBookMatch | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // 可编辑字段
  const [editedTitle, setEditedTitle] = useState('');
  const [editedAuthor, setEditedAuthor] = useState('');
  const [editedGenre, setEditedGenre] = useState('');
  const [editedCountry, setEditedCountry] = useState('');
  const [editedCountryCode, setEditedCountryCode] = useState('');
  
  // 阅读记录字段
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [review, setReview] = useState('');

  // 计算封面URL，优先使用本地图片库
  const coverUrl = useMemo(() => {
    if (!matchedBook) return null;
    // 1. 如果API返回了封面URL，优先使用
    if (matchedBook.coverUrl) {
      return matchedBook.coverUrl;
    }
    // 2. 尝试从本地图片库匹配
    const localCover = getLocalCoverUrl(matchedBook.title);
    return localCover || null;
  }, [matchedBook]);

  const resetForm = () => {
    setBookTitle('');
    setMatchedBook(null);
    setIsEditing(false);
    setEditedTitle('');
    setEditedAuthor('');
    setEditedGenre('');
    setEditedCountry('');
    setEditedCountryCode('');
    setStartDate('');
    setEndDate('');
    setReview('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleMatchBook = async () => {
    if (!bookTitle.trim()) {
      toast.error('请输入书名');
      return;
    }

    setIsMatching(true);
    setMatchedBook(null);

    try {
      const { data, error } = await supabase.functions.invoke('match-book', {
        body: { bookTitle: bookTitle.trim() },
      });

      if (error) {
        console.error('Match book error:', error);
        toast.error('匹配失败，请稍后重试');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.book) {
        setMatchedBook(data.book);
        setEditedTitle(data.book.title);
        setEditedAuthor(data.book.author);
        setEditedGenre(data.book.genre || '');
        setEditedCountry(data.book.country);
        setEditedCountryCode(data.book.countryCode);
        toast.success('书籍匹配成功！');
      }
    } catch (err) {
      console.error('Match book exception:', err);
      toast.error('网络错误，请检查连接');
    } finally {
      setIsMatching(false);
    }
  };

  const handleSave = () => {
    if (!matchedBook && !isEditing) {
      toast.error('请先匹配或输入书籍信息');
      return;
    }

    const bookInfo: BookInfo = {
      id: crypto.randomUUID(),
      title: isEditing ? editedTitle : matchedBook!.title,
      author: isEditing ? editedAuthor : matchedBook!.author,
      genre: isEditing ? editedGenre : matchedBook?.genre,
      country: isEditing ? editedCountry : matchedBook!.country,
      countryCode: isEditing ? editedCountryCode : matchedBook!.countryCode,
      coverUrl: isEditing ? undefined : matchedBook?.coverUrl, // 保存封面URL
    };

    if (!bookInfo.title || !bookInfo.author || !bookInfo.country || !bookInfo.countryCode) {
      toast.error('请填写完整的书籍信息');
      return;
    }

    onSave(bookInfo, startDate || undefined, endDate || undefined, review || undefined);
    toast.success('阅读足迹已记录！');
    handleClose();
  };

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
            onClick={handleClose}
          />
          
          {/* 面板 */}
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md glass-panel border-l border-border/50 shadow-elevated z-50 overflow-hidden flex flex-col"
          >
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-medium text-foreground">记录阅读足迹</h2>
                  <p className="text-sm text-muted-foreground">输入书名，AI帮你匹配信息</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="btn-icon"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto scrollbar-elegant px-6 py-5 space-y-6">
              {/* 书名输入 */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">书名</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleMatchBook()}
                    placeholder="输入书名，如：百年孤独"
                    className="warm-input flex-1"
                  />
                  <button
                    onClick={handleMatchBook}
                    disabled={isMatching || !bookTitle.trim()}
                    className="btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isMatching ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* AI匹配结果 */}
              <AnimatePresence mode="wait">
                {matchedBook && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-forest" />
                        <span className="text-sm font-medium text-forest">AI匹配成功</span>
                      </div>
                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="text-sm text-primary hover:underline"
                      >
                        {isEditing ? '使用匹配结果' : '手动调整'}
                      </button>
                    </div>

                    <div className="warm-card p-4 space-y-4">
                      {/* 书籍封面预览 */}
                      {coverUrl && !isEditing && (
                        <div className="flex justify-center mb-4">
                          <div className="book-cover w-32 h-48">
                            <img
                              src={coverUrl}
                              alt={matchedBook.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // 如果图片加载失败，隐藏封面
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* 书名 */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <BookOpen className="w-4 h-4" />
                          <span>书名</span>
                        </div>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            className="warm-input"
                          />
                        ) : (
                          <p className="font-serif text-foreground">{matchedBook.title}</p>
                        )}
                      </div>

                      {/* 作者 */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span>作者</span>
                        </div>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedAuthor}
                            onChange={(e) => setEditedAuthor(e.target.value)}
                            className="warm-input"
                          />
                        ) : (
                          <p className="text-foreground">{matchedBook.author}</p>
                        )}
                      </div>

                      {/* 类型 */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Tag className="w-4 h-4" />
                          <span>类型</span>
                        </div>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedGenre}
                            onChange={(e) => setEditedGenre(e.target.value)}
                            className="warm-input"
                          />
                        ) : (
                          <span className="tag">{matchedBook.genre}</span>
                        )}
                      </div>

                      {/* 作者国籍 */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>作者国籍</span>
                        </div>
                        {isEditing ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editedCountry}
                              onChange={(e) => setEditedCountry(e.target.value)}
                              placeholder="作者国籍（国家名）"
                              className="warm-input flex-1"
                            />
                            <input
                              type="text"
                              value={editedCountryCode}
                              onChange={(e) => setEditedCountryCode(e.target.value.toUpperCase())}
                              placeholder="代码"
                              className="warm-input w-20"
                              maxLength={2}
                            />
                          </div>
                        ) : (
                          <p className="text-foreground">
                            {getCountryFlag(matchedBook.countryCode)} {matchedBook.country}
                          </p>
                        )}
                      </div>

                      {/* 简介 */}
                      {matchedBook.description && !isEditing && (
                        <div className="pt-2 border-t border-border">
                          <p className="text-sm text-muted-foreground italic">
                            "{matchedBook.description}"
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="divider" />

                    {/* 阅读时间 */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>阅读时间</span>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground mb-1 block">开始</label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="warm-input"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground mb-1 block">结束</label>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="warm-input"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 短评 */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <MessageSquare className="w-4 h-4" />
                          <span>短评</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{review.length}/100</span>
                      </div>
                      <textarea
                        value={review}
                        onChange={(e) => setReview(e.target.value.slice(0, 100))}
                        placeholder="写下你的阅读感想...（可选）"
                        rows={3}
                        className="warm-input resize-none"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 空状态提示 */}
              {!matchedBook && !isMatching && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">输入书名并点击✨按钮</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">AI将自动匹配书籍信息与作者国籍</p>
                </div>
              )}

              {/* 加载中 */}
              {isMatching && (
                <div className="text-center py-8">
                  <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
                  <p className="text-foreground">正在匹配书籍信息...</p>
                  <p className="text-sm text-muted-foreground mt-1">AI正在识别书籍与作者国籍</p>
                </div>
              )}
            </div>

            {/* 底部按钮 */}
            <div className="px-6 py-4 border-t border-border/50 glass-panel">
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="btn-secondary flex-1"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={!matchedBook}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  保存足迹
                </button>
              </div>
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

export default BookInputPanel;
