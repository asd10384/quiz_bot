
export interface page_data {
  url: string;
  desc: string;
  quiz: string;
  customimg: boolean;
  space: boolean;
  complite: number;
  start: boolean;
};

export interface page {
  [key: string]: {
    [key: string]: {
      [key: string]: page_data;
    }
  }
};