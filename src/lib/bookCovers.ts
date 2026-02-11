/**
 * 书籍封面图片工具函数
 * 用于匹配本地图片库中的书籍封面
 */

// 获取所有可用的本地封面图片列表
// 这些图片位于 public/book-covers/ 目录
// 注意：文件名需要与 book-covers 目录中的实际文件名完全匹配（不包括 .jpg 扩展名）
const LOCAL_COVER_NAMES = [
  '1984',
  '2666',
  '万尼亚舅舅·三姊妹·樱桃园',
  '万历十五年',
  '三体全集',
  '三国演义（全二册）',
  '不可能性',
  '与希罗多德一起旅行',
  '中世纪厨房：一部食谱社会史',
  '东方快车谋杀案',
  '中国历代政治得失',
  '人类简史',
  '人间便利店',
  '伊利亚特',
  '信仰',
  '傲慢与偏见',
  '先知之歌',
  '冰与火之歌（卷一）',
  '刀锋',
  '十一个时区之旅',
  '卡拉马佐夫兄弟',
  '卢克明的偷偷一笑',
  '去蒂华纳做手术',
  '名作家和他们的衣橱',
  '向左走·向右走',
  '呐喊',
  '和语言漫步的日记',
  '哈利·波特',
  '啤酒谋杀案',
  '围城',
  '地球星人',
  '城南旧事',
  '基督山伯爵',
  '大萝卜和难挑的鳄梨',
  '大裂',
  '天真的人类学家',
  '天龙八部',
  '太阳的阴影',
  '失踪的孩子',
  '如梦之梦',
  '嫌疑人X的献身',
  '安徒生童话故事集',
  '寻羊冒险记',
  '寻路中国',
  '射雕英雄传（全四册）',
  '小城与不确定性的墙',
  '小王子',
  '局外人',
  '平凡的世界（全三部）',
  '乡土中国',
  '德意志文学简史',
  '思考就是我的抵抗',
  '我与地坛',
  '戴面具的日子',
  '房思琪的初恋乐园',
  '房树人投射测验',
  '拉德茨基进行曲',
  '捕云记',
  '撒哈拉的故事',
  '新名字的故事',
  '无人生还',
  '明朝那些事儿（1-9）',
  '明朝那些事儿5',
  '明朝那些事儿7',
  '星辰啜露',
  '月亮和六便士',
  '杀死一只知更鸟',
  '杜英诺悲歌：里尔克诗选',
  '格林童话全集',
  '桃花源没事儿',
  '死刑判决',
  '江城',
  '沉默的大多数',
  '活着',
  '流俗地',
  '浮生六记',
  '漂流船',
  '澄明之境',
  '爱吃沙拉的狮子',
  '猫和狗的生活哲学',
  '献灯使',
  '生命式',
  '番茄工作法图解',
  '白夜行',
  '白鹤亮翅',
  '白鹿原',
  '百年孤独',
  '看不见的中东',
  '福尔摩斯探案全集（上中下）',
  '笑傲江湖（全四册）',
  '红楼梦',
  '素食者',
  '绕颈之物',
  '绿毛水怪',
  '罗杰疑案',
  '罪与罚',
  '翻译的乐趣',
  '肖申克的救赎',
  '自由之思想 独立之人格',
  '莎士比亚书店',
  '西方时尚文化史',
  '西方谐典',
  '要有光',
  '观看的技艺：里尔克论塞尚书信选',
  '试刊号',
  '贝伦与露西恩',
  '赞美闲散',
  '追寻逝去的时光 第二卷：在少女花影下',
  '追寻逝去的时光一',
  '追风筝的人',
  '遇到百分之百的女孩',
  '邓小平时代',
  '野草',
  '错把路灯当月亮',
  '隋唐制度渊源略论稿 唐代政治史述论稿',
  '霍乱时期的爱情',
  '飘',
  '飞魂',
  '饥饿的女儿',
  '香蕉、沙滩与基地——国际政治中的女性主义',
  '马普尔小姐之木屋奇案',
  '魔鬼少年',
  '黄金时代',
  '黑暗的心 吉姆爷',
  '黑马波段操盘术（升级版）',
];

/**
 * 根据书名匹配本地封面图片
 * @param bookTitle 书籍标题
 * @returns 本地图片路径，如果未找到则返回 null
 */
export function getLocalCoverUrl(bookTitle: string): string | null {
  if (!bookTitle) return null;

  // 清理书名：移除多余空格
  const cleanTitle = bookTitle.trim();
  
  // 精确匹配
  const exactMatch = LOCAL_COVER_NAMES.find(name => name === cleanTitle);
  if (exactMatch) {
    return `/book-covers/${encodeURIComponent(exactMatch)}.jpg`;
  }

  // 模糊匹配：检查书名是否包含在本地图片名称中，或本地图片名称是否包含在书名中
  // 但要求匹配长度至少为3个字符，避免误匹配
  const fuzzyMatch = LOCAL_COVER_NAMES.find(name => {
    const normalizedName = name.toLowerCase();
    const normalizedTitle = cleanTitle.toLowerCase();
    
    // 如果书名或图片名称太短，跳过模糊匹配
    if (normalizedName.length < 3 || normalizedTitle.length < 3) {
      return false;
    }
    
    // 检查是否包含，但要求匹配部分至少3个字符
    if (normalizedName.includes(normalizedTitle)) {
      return normalizedTitle.length >= 3;
    }
    if (normalizedTitle.includes(normalizedName)) {
      return normalizedName.length >= 3;
    }
    
    return false;
  });

  if (fuzzyMatch) {
    return `/book-covers/${encodeURIComponent(fuzzyMatch)}.jpg`;
  }

  // 部分匹配：检查关键部分是否匹配（移除括号内容、标点符号等）
  // 但要求匹配长度至少为3个字符
  const simplifiedTitle = cleanTitle
    .replace(/[（(].*?[）)]/g, '') // 移除括号内容
    .replace(/[·\s]/g, '') // 移除空格和点号
    .toLowerCase();
  
  // 如果简化后的书名太短，跳过部分匹配
  if (simplifiedTitle.length < 3) {
    return null;
  }
  
  const partialMatch = LOCAL_COVER_NAMES.find(name => {
    const simplifiedName = name
      .replace(/[（(].*?[）)]/g, '')
      .replace(/[·\s]/g, '')
      .toLowerCase();
    
    // 精确匹配
    if (simplifiedName === simplifiedTitle) {
      return true;
    }
    
    // 包含匹配，但要求匹配部分至少3个字符
    if (simplifiedName.includes(simplifiedTitle)) {
      return simplifiedTitle.length >= 3;
    }
    if (simplifiedTitle.includes(simplifiedName)) {
      return simplifiedName.length >= 3;
    }
    
    return false;
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
