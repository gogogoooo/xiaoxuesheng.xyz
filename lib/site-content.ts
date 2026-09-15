export type Accent = 'amber' | 'blue' | 'violet' | 'green';

export type EntryCard = {
  slug: string;
  title: string;
  description: string;
  href: string;
  label: string;
  accent: Accent;
};

export type SubjectSlug = 'circuits' | 'physics' | 'chemistry';

export type SubjectCard = EntryCard & {
  slug: SubjectSlug;
  ageHint: string;
};

export type ExperimentCard = EntryCard & {
  ageHint: string;
  status: 'available' | 'coming-soon';
};

export const siteSections: EntryCard[] = [
  {
    slug: 'lab',
    title: '小朋友实验室',
    description: '在电路、物理和化学的小世界里，动手试一试每一个好奇的问题。',
    href: '/lab',
    label: '从好奇开始',
    accent: 'amber',
  },
  {
    slug: 'apps',
    title: '小程序 · Demo · 工具',
    description: '收集正在打磨的小程序、在线 Demo 与让生活更顺手的小工具。',
    href: '/apps',
    label: '持续制作中',
    accent: 'blue',
  },
  {
    slug: 'works',
    title: '网页 · 网站 · 汇报材料',
    description: '展示网页作品、网站原型和把复杂内容讲清楚的汇报材料。',
    href: '/works',
    label: '作品陈列室',
    accent: 'violet',
  },
];

export const labSubjects: SubjectCard[] = [
  {
    slug: 'circuits',
    title: '电路实验',
    description: '从一节电池、一盏小灯开始，搭出会发光、会转动的电路。',
    href: '/lab/circuits',
    label: '1 个实验',
    accent: 'amber',
    ageHint: '建议 6 岁以上',
  },
  {
    slug: 'physics',
    title: '物理实验',
    description: '把声音、光、力和运动变成看得见、摸得着的小游戏。',
    href: '/lab/physics',
    label: '正在准备',
    accent: 'blue',
    ageHint: '建议 6 岁以上',
  },
  {
    slug: 'chemistry',
    title: '化学实验',
    description: '用安全的互动方式认识颜色、变化和藏在身边的小秘密。',
    href: '/lab/chemistry',
    label: '正在准备',
    accent: 'green',
    ageHint: '建议 7 岁以上',
  },
];

export const experimentsBySubject: Record<SubjectSlug, ExperimentCard[]> = {
  circuits: [
    {
      slug: 'little-circuit',
      title: '小小电路实验室',
      description: '拿出电池、灯泡、开关和小电机，自由连线，看看会发生什么。',
      href: '/lab/circuits/little-circuit',
      label: '开始搭建',
      accent: 'amber',
      ageHint: '建议 6 岁以上',
      status: 'available',
    },
  ],
  physics: [],
  chemistry: [],
};

export function isSubjectSlug(value: string): value is SubjectSlug {
  return value === 'circuits' || value === 'physics' || value === 'chemistry';
}
