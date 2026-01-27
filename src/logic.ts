const commandNameArray = ["insert", "delete", "history", "list", "myList", "refund", "help", "button"] as const;
export type commandName = typeof commandNameArray[number];
const commandNameSet: Set<string> = new Set(commandNameArray);
export const isCommandName = (value: string): value is commandName => {
  return commandNameSet.has(value);
};

const globalButtonNameBodyArray = ["insert", "history", "myList", "refund"] as const;
type globalButtonNameBody = typeof globalButtonNameBodyArray[number];
const globalButtonNameBodySet: Set<string> = new Set(globalButtonNameBodyArray);
export type globalButtonName = `__global_${globalButtonNameBody}`;
export type innerButtonName = `__inner_${string}`;
export type buttonName = globalButtonName | innerButtonName;
const isGlobalButtonNameBody = (value: string): value is globalButtonNameBody => {
  return globalButtonNameBodySet.has(value);
};
export const isGlobalButtonName = (value: string): value is globalButtonName => {
  const prefix = value.slice(0, 9);
  const body = value.slice(9, value.length);
  return prefix === "__global_" && isGlobalButtonNameBody(body);
};
export const getGlobalButtonNameBody = (value: globalButtonName): globalButtonNameBody => {
  return value.slice(9, value.length) as globalButtonNameBody;
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