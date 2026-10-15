export const heroSlides = [
  {
    id: 'predict',
    label: '比分预测',
    icon: 'target',
    eyebrow: 'BEFORE THE WHISTLE',
    title: ['热爱比赛，', '也相信你的判断。'],
    description: ['从赛前的直觉，到终场的答案。', '记录每一次预测，读懂每一场比赛。'],
    action: '做出我的预测',
    caption: '在开赛前，留下你的答案',
  },
  {
    id: 'squad',
    label: '球队阵容',
    icon: 'squad',
    eyebrow: 'YOUR TEAM. YOUR TACTICS.',
    title: ['认识每位枪手，', '排出你的理想阵容。'],
    description: [
      '查看球员最近五场的表现，找到场上的关键。',
      '选择阵型、拖入球员，打造你的首发十一人。',
    ],
    action: '进入球队阵容',
    caption: '从球员表现，到你的战术板',
  },
  {
    id: 'review',
    label: '预测复盘',
    icon: 'history',
    eyebrow: 'AFTER THE FINAL WHISTLE',
    title: ['终场哨响，', '回看当时的判断。'],
    description: ['把赛前预测与最终赛果放在一起。', '回看比分、信心与理由，积累下一场的经验。'],
    action: '回看我的预测',
    caption: '让每一场比赛，都留下收获',
  },
  {
    id: 'stats',
    label: '数据统计',
    icon: 'chart',
    eyebrow: 'EVERY CALL COUNTS',
    title: ['让比赛的答案，', '成为你的进步线索。'],
    description: [
      '从方向命中到精确比分，了解自己的预测表现。',
      '对比英超与欧冠，发现判断中的规律。',
    ],
    action: '查看预测统计',
    caption: '每一份判断，都有迹可循',
  },
] as const

export type HeroDestination = (typeof heroSlides)[number]['id']
