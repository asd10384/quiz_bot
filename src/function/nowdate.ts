const week = ['일','월','화','수','목','금','토'];

export default function nowdate() {
  const date = new Date();
  return `${
    date.getFullYear()
  }년 ${
    az(date.getMonth())
  }월 ${
    az(date.getDate())
  }일 (${
    week[date.getDay()]
  }) ${
    az(date.getHours())
  }:${
    az(date.getMinutes())
  }:${
    az(date.getSeconds())
  }`;
}

function az(n: number): string {
  if (n < 10) return '0'+n;
  return ''+n;
}