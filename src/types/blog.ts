export interface Insight {
  id: string;
  blog: string;
  blogStyle: string;
  title: string;
  summary: string;
  reflection?: string;
  application: string;
  articleUrl?: string;
  date: string;
}

export interface CustomBlog {
  id: string;
  label: string;
  url: string;
  bg: string;
  text: string;
}

export interface DevRecord {
  id: string;
  title: string;
  content: string;
  date: string;
}

export type BlogLog = Insight;
