const commandNameArray = ["insert", "delete", "history", "list", "myList", "refund", "help", "button"] as const;
export type commandName = typeof commandNameArray[number];
const commandNameSet: Set<string> = new Set(commandNameArray);
export const isCommandName = (value: string): value is commandName => {
  return commandNameSet.has(value);
};

const globalButtonNameBaseArray = ["insert", "history", "myList", "refund"] as const;
type globalButtonNameBase = typeof globalButtonNameBaseArray[number];
const globalButtonNameBaseSet: Set<string> = new Set(globalButtonNameBaseArray);
export type globalButtonName = `__global_${globalButtonNameBase}`;
export type innerButtonName = `__inner_${string}`;
export type buttonName = globalButtonName | innerButtonName;
const isGlobalButtonNameBase = (value: string): value is globalButtonNameBase => {
  return globalButtonNameBaseSet.has(value);
};
export const isGlobalButtonName = (value: string): value is globalButtonName => {
  const prefix = value.slice(0, 9);
  const body = value.slice(8, value.length);
  return prefix === "__global_" && isGlobalButtonNameBase(body);
};
export const getGlobalButtonNameBody = (value: globalButtonName): globalButtonNameBase => {
  return value.slice(9, value.length) as globalButtonNameBase;
};
export const isInnerButtonName = (value: string): value is innerButtonName => {
  const prefix = value.slice(0, 8);
  return prefix === "__inner_";
};
export const getInnerButtonNameBody = (value: globalButtonName): string => {
  return value.slice(8, value.length);
};
export const isButtonName = (value: string): value is buttonName => {
 return isGlobalButtonName(value) || isInnerButtonName(value);
};