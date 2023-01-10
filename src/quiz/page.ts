import { page, page_data } from "./quizClass";

export const dataswitch = (page: string[], data: page): { getlist: string[]; getvalue: page_data | null } => {
  let getlist: string[] = [];
  let getvalue: page_data | null = null;
  switch (page.length) {
    case 0:
      getlist = Object.keys(data);
      break;
    case 1:
      getlist = Object.keys(data[page[0]]);
      break;
    case 2:
      getlist = Object.keys(data[page[0]][page[1]]);
      break;
    case 3:
      getlist = Object.keys(data[page[0]][page[1]][page[2]]);
      getvalue = data[page[0]][page[1]][page[2]];
      break;
  }
  return {
    getlist: getlist,
    getvalue: getvalue
  };
}