import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
                    <svg 
                      className="w-8 h-8 text-primary scale-[1.8]" 
                      viewBox="0 0 800 800" 
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g transform="translate(62.948288,766.966564) scale(0.089996,-0.089996)" fill="currentColor" stroke="none">
                        <path d="M5555 6064 c-576 -39 -1007 -170 -1372 -416 -90 -60 -268 -211 -277 -234 -6 -15 -16 -8 -64 37 -221 214 -471 364 -770 462 -223 74 -512 130 -739 144 -97 6 -103 5 -146 -20 -25 -15 -56 -44 -69 -64 l-23 -38 0 -1165 0 -1165 23 -37 c40 -65 74 -78 241 -93 243 -22 447 -68 627 -140 73 -30 167 -76 119 -59 -247 87 -692 145 -982 129 l-123 -7 0 1231 c0 1356 4 1281 -62 1321 -44 27 -97 26 -139 -3 -43 -29 -59 -60 -59 -118 l0 -46 -79 -7 c-125 -10 -192 -42 -229 -109 -16 -30 -17 -121 -20 -1430 -2 -961 1 -1411 8 -1438 15 -53 63 -106 111 -121 43 -12 31 -14 289 40 210 45 368 63 600 69 443 12 850 -56 1275 -214 127 -47 162 -50 212 -18 35 24 63 75 63 118 0 70 -148 323 -279 475 -265 308 -683 507 -1196 570 l-140 17 -3 1033 c-1 567 0 1032 2 1032 28 0 265 -35 346 -51 310 -62 620 -197 819 -359 80 -65 93 -80 68 -80 -50 0 -325 -106 -419 -161 -211 -124 -317 -299 -305 -498 9 -153 75 -279 214 -412 133 -127 273 -209 653 -384 322 -148 366 -170 475 -242 230 -152 315 -315 271 -519 -22 -99 -97 -256 -170 -354 -73 -97 -216 -243 -336 -341 -119 -97 -139 -130 -120 -200 15 -56 63 -89 127 -89 58 0 57 -1 218 141 268 235 417 437 504 682 101 286 46 531 -166 743 -141 141 -279 220 -799 462 -436 202 -614 357 -614 531 0 68 32 141 81 188 36 33 150 106 156 99 3 -2 -6 -24 -19 -48 -19 -36 -23 -58 -23 -138 0 -82 4 -103 26 -150 75 -158 250 -271 557 -358 116 -33 388 -92 543 -117 35 -5 36 -7 42 -55 13 -110 140 -318 287 -472 98 -102 117 -104 197 -20 31 31 92 105 136 164 92 123 70 120 209 26 447 -305 535 -781 266 -1441 -22 -54 -40 -113 -40 -131 0 -109 125 -167 206 -95 51 44 148 295 200 519 69 293 59 572 -28 804 -14 38 -26 69 -26 70 0 0 24 1 54 1 47 0 59 4 86 30 17 16 35 45 41 65 6 23 9 420 7 1181 l-3 1145 -25 37 c-14 21 -43 50 -64 65 -39 27 -41 27 -210 28 -94 1 -193 -1 -221 -2z m264 -1336 l0 -1083 -22 29 c-112 149 -236 262 -403 368 l-111 70 -7 61 c-12 121 -94 245 -197 301 -101 55 -198 68 -304 41 -70 -19 -116 -44 -170 -96 l-41 -39 -186 35 c-344 64 -583 134 -687 199 -115 73 -146 130 -110 203 27 55 62 84 201 162 100 57 131 82 268 216 207 203 313 279 520 379 255 122 544 194 930 230 19 1 99 4 178 4 l142 2 -1 -1082z m-4079 -318 c0 -919 2 -1126 14 -1153 15 -38 76 -95 109 -102 12 -2 164 -6 337 -8 331 -5 451 -17 665 -67 93 -22 279 -80 273 -85 -2 -2 -25 1 -52 6 -84 15 -325 38 -481 45 -267 12 -651 -27 -909 -92 l-26 -6 0 1285 0 1286 28 4 c15 2 30 5 35 6 4 0 7 -503 7 -1119z m3218 -160 c59 -36 79 -126 42 -188 -78 -127 -260 -71 -260 80 0 50 32 101 74 118 39 16 110 11 144 -10z"/>
                      </g>
                    </svg>
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
