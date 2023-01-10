import colors from "colors/safe";
import { Timestamp } from "./Timestamp";

type logType = "log" | "info" | "warn" | "error" | "debug" | "ready" | "slash";

export const log = (content: string, type: logType) => {
  const timestamp = colors.white(`[${Timestamp()}]`);

  switch (type) {
    case "log":
      return console.log(`${colors.gray("[LOG]")} ${timestamp} ${content}`);
      
    case "info":
      return console.log(`${colors.cyan("[INFO]")} ${timestamp} ${content}`);
      
    case "warn":
      return console.log(`${colors.yellow("[WARN]")} ${timestamp} ${content}`);
      
    case "error":
      return console.log(`${colors.red("[ERROR]")} ${timestamp} ${content}`);
      
    case "debug":
      return console.log(`${colors.magenta("[DEBUG]")} ${timestamp} ${content}`);
      
    case "ready":
      return console.log(`${colors.green("[READY]")} ${timestamp} ${content}`);
      
    default:
      throw new TypeError("Logger 타입이 올바르지 않습니다.");
  }
};

export const Logger = {
  log: (content: string) => log(content, "log"),
  warn: (content: string) => log(content, "warn"),
  error: (content: string) => log(content, "error"),
  debug: (content: string) => log(content, "debug"),
  info: (content: string) => log(content, "info"),
  ready: (content: string) => log(content, "ready")
}
