import { GradeOption } from "@/lib/grades";
import { CourseTrack, SubjectConfig } from "@/lib/types";

const JUNIOR_1_2 = [
  "国語",
  "社会（地理分野・歴史分野）",
  "数学",
  "理科",
  "音楽",
  "美術",
  "保健",
  "体育",
  "技術・家庭",
  "外国語（英語）",
];

const JUNIOR_3 = [
  "国語",
  "社会（公民分野）",
  "数学",
  "理科",
  "音楽",
  "美術",
  "保健",
  "体育",
  "技術・家庭",
  "外国語（英語）",
];

const HIGH_1 = [
  "現代の国語",
  "言語文化",
  "歴史総合",
  "地理総合",
  "数学Ⅰ",
  "数学A",
  "物理基礎",
  "化学基礎",
  "生物基礎",
  "地学基礎",
  "体育",
  "保健",
  "音楽Ⅰ",
  "美術Ⅰ",
  "工芸Ⅰ",
  "書道Ⅰ",
  "英語コミュニケーションⅠ",
  "論理・表現Ⅰ",
  "家庭基礎",
  "家庭総合",
  "情報Ⅰ",
];

const HIGH_2_ARTS = [
  "論理国語",
  "文学国語",
  "古典探究",
  "地理歴史",
  "世界史探究",
  "日本史探究",
  "公共",
  "数学Ⅱ",
  "物理基礎",
  "化学基礎",
  "生物基礎",
  "地学基礎",
  "体育",
  "保健",
  "英語コミュニケーションⅡ",
  "論理・表現Ⅱ",
];

const HIGH_2_SCIENCE = [
  "論理国語",
  "公共",
  "数学Ⅱ",
  "数学B",
  "物理",
  "化学",
  "生物",
  "体育",
  "保健",
  "英語コミュニケーションⅡ",
  "論理・表現Ⅱ",
];

const HIGH_3_ARTS = [
  "国語表現",
  "古典探究",
  "地理探究",
  "世界史探究",
  "日本史探究",
  "倫理",
  "政治・経済",
  "数学B",
  "数学C",
  "体育",
  "英語コミュニケーションⅢ",
  "論理・表現Ⅲ",
];

const HIGH_3_SCIENCE = [
  "数学Ⅲ",
  "数学C",
  "物理",
  "化学",
  "生物",
  "歴史総合",
  "地理総合",
  "体育",
  "英語コミュニケーションⅢ",
  "論理・表現Ⅲ",
];

export function needsCourseTrack(grade: string): boolean {
  return grade === "高校2年" || grade === "高校3年";
}

export function getCatalogSubjects(
  grade: string,
  track?: CourseTrack
): string[] {
  switch (grade as GradeOption) {
    case "中学1年":
    case "中学2年":
      return JUNIOR_1_2;
    case "中学3年":
      return JUNIOR_3;
    case "高校1年":
      return HIGH_1;
    case "高校2年":
      return track === "science" ? HIGH_2_SCIENCE : HIGH_2_ARTS;
    case "高校3年":
      return track === "science" ? HIGH_3_SCIENCE : HIGH_3_ARTS;
    default:
      return [];
  }
}

export function subjectCatalogId(grade: string, name: string): string {
  return `cat-${grade}-${name}`;
}

export function buildAllSubjects(
  grade: string,
  track?: CourseTrack
): SubjectConfig[] {
  return getCatalogSubjects(grade, track).map((name) => ({
    id: subjectCatalogId(grade, name),
    name,
    units: [],
    strength: "normal" as const,
  }));
}
