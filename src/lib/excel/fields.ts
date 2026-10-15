/**
 * Excel 导入/导出共用的列定义。
 * 该文件不依赖 exceljs，服务端与客户端均可引用。
 */

export type FieldSpec = {
  /** 规范化字段名（与数据库列对应） */
  key: string;
  /** 模板中的默认表头 */
  label: string;
  /** 可接受的表头别名，匹配时会去除空格并转小写 */
  aliases: string[];
  required?: boolean;
  /** 模板示例行 */
  example?: string;
};

export const STUDENT_FIELDS: FieldSpec[] = [
  { key: "name", label: "姓名", aliases: ["姓名", "学生姓名", "名字", "name", "studentname", "student_name", "学生"], required: true, example: "张小明" },
  { key: "enName", label: "英文名", aliases: ["英文名", "英文名字", "englishname", "en_name", "enname", "english name"], example: "Tom" },
  { key: "gender", label: "性别", aliases: ["性别", "gender", "sex"], example: "男" },
  { key: "studentNo", label: "学号", aliases: ["学号", "编号", "studentno", "student_no", "no", "number"], example: "20240101" },
  { key: "seatNo", label: "座位号", aliases: ["座位号", "座号", "座位", "seatno", "seat_no", "seat"], example: "1" },
];

export const VOCAB_WORD_FIELDS: FieldSpec[] = [
  { key: "word", label: "单词", aliases: ["单词", "词语", "词汇", "word", "term", "vocabulary"], required: true, example: "explore" },
  { key: "meaning", label: "释义", aliases: ["释义", "中文释义", "中文", "意思", "翻译", "meaning", "translation", "chinese"], example: "探索；勘探" },
  { key: "phoneticUs", label: "音标", aliases: ["音标", "美式音标", "发音", "phonetic", "phonetic_us", "pronunciation"], example: "/ɪkˈsplɔːr/" },
  { key: "partOfSpeech", label: "词性", aliases: ["词性", "pos", "partofspeech", "part_of_speech"], example: "v." },
  { key: "exampleEn", label: "英文例句", aliases: ["英文例句", "例句", "example", "example_en", "sentence"], example: "We explored the island." },
  { key: "exampleZh", label: "中文例句", aliases: ["中文例句", "例句翻译", "example_zh", "translation_zh"], example: "我们探索了那座岛。" },
];

export const DICTATION_WORD_FIELDS: FieldSpec[] = [
  { key: "word", label: "单词", aliases: ["单词", "词语", "词汇", "word", "term"], required: true, example: "apple" },
  { key: "meaning", label: "释义", aliases: ["释义", "中文释义", "中文", "意思", "翻译", "meaning", "translation"], example: "苹果" },
];

export type ImportKind = "students" | "vocab" | "dictation-words";

export function fieldsFor(kind: ImportKind): FieldSpec[] {
  if (kind === "students") return STUDENT_FIELDS;
  if (kind === "vocab") return VOCAB_WORD_FIELDS;
  return DICTATION_WORD_FIELDS;
}

/** 表头归一化：去空格/括号内容不影响，转小写 */
export function normalizeHeader(header: string): string {
  return String(header ?? "")
    .replace(/[\s\u3000]/g, "")
    .replace(/[（）()【】\[\]]/g, "")
    .toLowerCase();
}

/** 根据表头文本匹配字段 key，未命中返回 null */
export function matchField(header: string, fields: FieldSpec[]): string | null {
  const h = normalizeHeader(header);
  if (!h) return null;
  for (const f of fields) {
    if (normalizeHeader(f.label) === h) return f.key;
  }
  for (const f of fields) {
    if (f.aliases.some((a) => normalizeHeader(a) === h)) return f.key;
  }
  // 退化为包含匹配，解决「姓名（必填）」这类表头
  for (const f of fields) {
    const label = normalizeHeader(f.label);
    if (label && (h.includes(label) || label.includes(h))) return f.key;
  }
  for (const f of fields) {
    if (f.aliases.some((a) => {
      const al = normalizeHeader(a);
      return al.length >= 2 && (h.includes(al) || al.includes(h));
    })) return f.key;
  }
  return null;
}

export function normalizeGender(raw: string): "male" | "female" | "unknown" {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v) return "unknown";
  if (["男", "男生", "male", "m", "boy", "1"].includes(v)) return "male";
  if (["女", "女生", "female", "f", "girl", "2"].includes(v)) return "female";
  return "unknown";
}

export function genderLabel(g: string): string {
  return g === "male" ? "男" : g === "female" ? "女" : "未知";
}

/**
 * 把「表头 -> 值」的原始行映射为规范化对象。
 * 返回 { row, missing } —— missing 为缺失的必填字段名。
 */
export function mapRow(
  raw: Record<string, string>,
  fields: FieldSpec[]
): { row: Record<string, string>; missing: string[] } {
  const row: Record<string, string> = {};
  for (const f of fields) row[f.key] = "";

  for (const [header, value] of Object.entries(raw)) {
    const key = matchField(header, fields);
    if (!key) continue;
    const text = String(value ?? "").trim();
    // 同一字段出现多次时，保留第一个非空值
    if (!row[key] && text) row[key] = text;
  }

  const missing = fields.filter((f) => f.required && !row[f.key]).map((f) => f.label);
  return { row, missing };
}
