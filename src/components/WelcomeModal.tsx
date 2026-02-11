import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookMarked } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/30 backdrop-blur-md z-[100]"
            onClick={onClose}
          />
          
          {/* 弹窗内容 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-[101] pointer-events-none px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="glass-panel rounded-3xl p-12 max-w-2xl w-full pointer-events-auto relative z-10">
              {/* Logo和标题 */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center mb-8"
              >
                <div className="flex items-center justify-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/20 backdrop-blur-sm flex items-center justify-center shadow-lg border border-primary/20">
                    <BookMarked className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-left">
                    <h1 className="font-serif text-4xl font-bold text-foreground tracking-tight">
                      阅迹
                    </h1>
                    <p className="text-lg text-muted-foreground -mt-1">ReadTrip</p>
                  </div>
                </div>
                
                {/* 副标题文字 */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  <p className="font-serif text-xl text-foreground/90 italic leading-relaxed">
                    在纸页间流浪，于现实中重逢
                  </p>
                  <p className="text-base text-muted-foreground italic leading-relaxed">
                    Wander through pages, reunite in reality.
                  </p>
                </motion.div>
              </motion.div>

              {/* 开始旅程按钮 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-center"
              >
                <button
                  onClick={onClose}
                  className="btn-primary rounded-full px-8 py-4 text-lg shadow-elevated"
                >
                  开始旅程
                </button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default WelcomeModal;
