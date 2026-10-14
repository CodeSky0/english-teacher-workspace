import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--primary)",
          d: "var(--primary-d)",
          l: "var(--primary-l)",
          2: "var(--primary-2)",
        },
        accent: "var(--accent)",
        bg: "var(--bg)",
        panel: "var(--panel)",
        line: "var(--line)",
        text: "var(--text)",
        muted: "var(--muted)",
        side: {
          bg: "var(--side-bg)",
          active: "var(--side-active)",
        },
        c: {
          listen: "var(--c-listen)",
          "listen-bg": "var(--c-listen-bg)",
          grammar: "var(--c-grammar)",
          "grammar-bg": "var(--c-grammar-bg)",
          read: "var(--c-read)",
          "read-bg": "var(--c-read-bg)",
          write: "var(--c-write)",
          "write-bg": "var(--c-write-bg)",
          vocab: "var(--c-vocab)",
          "vocab-bg": "var(--c-vocab-bg)",
          speak: "var(--c-speak)",
          "speak-bg": "var(--c-speak-bg)",
          exam: "var(--c-exam)",
          "exam-bg": "var(--c-exam-bg)",
          homework: "var(--c-homework)",
          "homework-bg": "var(--c-homework-bg)",
          other: "var(--c-other)",
          "other-bg": "var(--c-other-bg)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
};

export default config;
