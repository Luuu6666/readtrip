/**
 * 书籍封面图片工具函数
 * 用于匹配本地图片库中的书籍封面
 */

// 获取所有可用的本地封面图片列表
// 这些图片位于 public/book-covers/ 目录
const LOCAL_COVER_NAMES = [
  '1984',
  '万历十五年',
  '三体全集',
  '三国演义（全二册）',
  '东方快车谋杀案',
  '中国历代政治得失',
  '人类简史',
  '傲慢与偏见',
  '冰与火之歌（卷一）',
  '刀锋',
  '动物农场',
  '呐喊',
  '哈利·波特',
  '围城',
  '城南旧事',
  '基督山伯爵',
  '天龙八部',
  '失踪的孩子',
  '嫌疑人X的献身',
  '安徒生童话故事集',
  '寻路中国',
  '射雕英雄传（全四册）',
  '小王子',
  '局外人',
  '平凡的世界（全三部）',
  '乡土中国',
  '我与地坛',
  '房思琪的初恋乐园',
  '撒哈拉的故事',
  '新名字的故事',
  '无人生还',
  '明朝那些事儿（1-9）',
  '月亮和六便士',
  '杀死一只知更鸟',
  '格林童话全集',
  '江城',
  '沉默的大多数',
  '活着',
  '白夜行',
  '白鹿原',
  '百年孤独',
  '福尔摩斯探案全集（上中下）',
  '笑傲江湖（全四册）',
  '红楼梦',
  '肖申克的救赎',
  '追风筝的人',
  '野草',
  '霍乱时期的爱情',
  '飘',
  '黄金时代',
];

/**
 * 根据书名匹配本地封面图片
 * @param bookTitle 书籍标题
 * @returns 本地图片路径，如果未找到则返回 null
 */
export function getLocalCoverUrl(bookTitle: string): string | null {
  if (!bookTitle) return null;

  // 清理书名：移除多余空格，转换为小写进行比较
  const cleanTitle = bookTitle.trim();
  
  // 精确匹配
  const exactMatch = LOCAL_COVER_NAMES.find(name => name === cleanTitle);
  if (exactMatch) {
    return `/book-covers/${encodeURIComponent(exactMatch)}.jpg`;
  }

  // 模糊匹配：检查书名是否包含在本地图片名称中，或本地图片名称是否包含在书名中
  const fuzzyMatch = LOCAL_COVER_NAMES.find(name => {
    const normalizedName = name.toLowerCase();
    const normalizedTitle = cleanTitle.toLowerCase();
    return normalizedName.includes(normalizedTitle) || normalizedTitle.includes(normalizedName);
  });

  if (fuzzyMatch) {
    return `/book-covers/${encodeURIComponent(fuzzyMatch)}.jpg`;
  }

  // 部分匹配：检查关键部分是否匹配（移除括号内容、标点符号等）
  const simplifiedTitle = cleanTitle
    .replace(/[（(].*?[）)]/g, '') // 移除括号内容
    .replace(/[·\s]/g, '') // 移除空格和点号
    .toLowerCase();
  
  const partialMatch = LOCAL_COVER_NAMES.find(name => {
    const simplifiedName = name
      .replace(/[（(].*?[）)]/g, '')
      .replace(/[·\s]/g, '')
      .toLowerCase();
    return simplifiedName === simplifiedTitle || 
           simplifiedName.includes(simplifiedTitle) ||
           simplifiedTitle.includes(simplifiedName);
  });

  if (partialMatch) {
    return `/book-covers/${encodeURIComponent(partialMatch)}.jpg`;
  }

  return null;
}

/**
 * 获取所有可用的本地封面图片路径
 * @returns 封面图片路径数组
 */
export function getAllLocalCovers(): string[] {
  return LOCAL_COVER_NAMES.map(name => `/book-covers/${encodeURIComponent(name)}.jpg`);
}

/**
 * 获取随机本地封面图片
 * @returns 随机封面图片路径
 */
export function getRandomLocalCover(): string {
  const randomIndex = Math.floor(Math.random() * LOCAL_COVER_NAMES.length);
  return `/book-covers/${encodeURIComponent(LOCAL_COVER_NAMES[randomIndex])}.jpg`;
}
