const ADJECTIVES = [
  '快乐的', '勇敢的', '聪明的', '好奇的', '闪亮的', '宁静的',
  '巨大的', '微小的', '神秘的', '迅速的', '温暖的', '冷静的',
  '活泼的', '温柔的', '狡猾的', '迷人的', '大胆的', '优雅的',
  '奇幻的', '坚韧的', '耀眼的', '灵动的', '沉稳的', '俏皮的'
];

const NOUNS = [
  '西瓜', '老虎', '月亮', '河流', '森林', '代码', '火箭',
  '城堡', '钥匙', '旅程', '梦想', '回声', '故事', '鲸鱼',
  '彩虹', '灯塔', '云朵', '山峰', '星辰', '书本', '风筝',
  '海洋', '火花', '村庄', '秘密', '微风', '宇宙'
];

const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * 生成一个格式为 "YYYYMMDD-形容词名词" 的随机名称
 * 例如: "20231027-快乐的火箭"
 */
export const generateRandomName = () => {
  const today = new Date();
  const year = today.getFullYear();
  // getMonth() 返回的月份是从 0 开始的 (0-11)，所以需要加 1
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  const datePrefix = `${year}-${month}-${day}`;

  const randomAdjective = getRandomElement(ADJECTIVES);
  const randomNoun = getRandomElement(NOUNS);

  // 返回最终组合的名称
  return `${datePrefix}-${randomAdjective}${randomNoun}`;
};