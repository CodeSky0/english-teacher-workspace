export function subjectStyle(name: string): { color: string; bg: string } {
  if (/(听力|听写)/.test(name)) return { color: "var(--c-listen)", bg: "var(--c-listen-bg)" };
  if (/(语法|句型)/.test(name)) return { color: "var(--c-grammar)", bg: "var(--c-grammar-bg)" };
  if (/(词汇|单词|默写)/.test(name)) return { color: "var(--c-vocab)", bg: "var(--c-vocab-bg)" };
  if (/(口语|朗读|演讲)/.test(name)) return { color: "var(--c-speak)", bg: "var(--c-speak-bg)" };
  if (/(阅读)/.test(name)) return { color: "var(--c-read)", bg: "var(--c-read-bg)" };
  if (/(写作|作文)/.test(name)) return { color: "var(--c-write)", bg: "var(--c-write-bg)" };
  if (/(习题|练习|复习|考试|测试|讲评|月考|期中|期末)/.test(name)) return { color: "var(--c-exam)", bg: "var(--c-exam-bg)" };
  if (/(作业)/.test(name)) return { color: "var(--c-homework)", bg: "var(--c-homework-bg)" };
  return { color: "var(--c-other)", bg: "var(--c-other-bg)" };
}
