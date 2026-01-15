const isWideChar = (char: string) : boolean => {
  const utfPoint: number = char.charCodeAt(0);
  return 12288 <= utfPoint && utfPoint <= 40959;
}

const equalWidthLength = (text: string, widthRate?: {narrow: number, wide: number}): {additionWideSpace: number, length: number} => {
  const {narrow: narrowRate, wide: wideRate} = widthRate === undefined ? {narrow: 1, wide: 2} : widthRate;

  let wideCharCount: number = 0;
  let narrowCharCount: number = 0;
  for (const v of text) {
    if (isWideChar(v)) {
      wideCharCount += 1;
    } else {
      narrowCharCount += 1;
    }
  }

  const additionWideSpace = wideCharCount % narrowRate === 0 ? 0 : narrowRate - wideCharCount % narrowRate;
  const wideCharChank = wideCharCount % narrowRate === 0 ? Math.floor(wideCharCount / narrowRate) : Math.floor(wideCharCount / narrowRate) + 1;

  return {
    additionWideSpace,
    length: narrowCharCount + wideCharChank * wideRate
  };
}

export const equalWidthFormat = (text: string, dight: number, option?: {widthRate?: {narrow: number, wide: number}, zeroPadding?: boolean, cut?: boolean}): string => {
  const {additionWideSpace, length} = equalWidthLength(text, option?.widthRate);

  if (dight < length && option?.cut === true) {
    // 文字列が指定の長さを超え、途中から省略する場合
    // "..."を少なくとも入れられるように、途中までで区切る

    const getCuttedString = (narrowCount: number, wideSpaceCount: number, wideCharChank: number, cuttedString: string) => {
      return `${"　".repeat(wideSpaceCount)}${cuttedString}${".".repeat(dight - (narrowCount + wideCharChank * wideRate))}`
    }

    const {narrow: narrowRate, wide: wideRate} = option?.widthRate === undefined ? {narrow: 1, wide: 2} : option.widthRate;
    // 幅広文字が来るたびに、(wideCharChank, wideSpaceCount)は、(0, 0) -> (narrow - 1, 1) -> (narrow - 2, 1) -> ... -> (1, 1) -> (0, 1) -> (narrow - 1, 2) -> ... と変化
    let wideSpaceCount: number = 0;
    let wideCharChank: number = 0;
    let narrowCount: number = 0;
    let cuttedString: string = "";
    for (const c of text) {
      if (isWideChar(c)) {
        wideCharChank += wideSpaceCount === 0 ? 1 : 0;
        wideSpaceCount = wideSpaceCount === 0 ? narrowRate - 1 : wideSpaceCount - 1;
        // cuttedStringに足す前に"もし足したら超えてしまわないか"の終了判定
        // 終了判定に引っかかるとき、cは足さずに終了(このとき、必ず元々のwideSpaceCountは0であるから、それを加味して足す)
        // cuttedString + 残りを埋める"."
        if (narrowCount + wideCharChank * wideRate + 3 > dight) {
          cuttedString = getCuttedString(narrowCount, 0, wideCharChank - 1, cuttedString);
          break;
        }
        cuttedString += c;
      } else {
        narrowCount += 1;
        // cuttedStringに足す前に"もし足したら超えてしまわないか"の終了判定
        // 終了判定に引っかかるとき、cは足さずに終了
        // 端数を埋める幅広空白 + cuttedString + 残りを埋める"."
        if (narrowCount + wideCharChank * wideRate + 3 > dight) {
          cuttedString = getCuttedString(narrowCount - 1, wideSpaceCount, wideCharChank, cuttedString);
          break;
        }
        cuttedString += c;
      }
    }
    return cuttedString;
  } else {
    // 文字列が指定の長さを超えない、もしくは途中から省略しない場合

    const padding: string = option?.zeroPadding === true ? "0" : " ";
    const formattedValue = `${"　".repeat(additionWideSpace)}${padding.repeat(dight > length ? dight - length : 0)}${text}`;
    return formattedValue;
  }
}

export const dateToString = (date: Date) => {
  return `${
    equalWidthFormat(`${date.getFullYear()}`, 4, {widthRate: {narrow: 3, wide: 5}, zeroPadding: true})
  }-${
    equalWidthFormat(`${date.getMonth() + 1}`, 2, {widthRate: {narrow: 3, wide: 5}, zeroPadding: true})
  }-${
    equalWidthFormat(`${date.getDate()}`, 2, {widthRate: {narrow: 3, wide: 5}, zeroPadding: true})
  } ${
    equalWidthFormat(`${date.getHours()}`, 2, {widthRate: {narrow: 3, wide: 5}, zeroPadding: true})
  }:${
    equalWidthFormat(`${date.getMinutes()}`, 2, {widthRate: {narrow: 3, wide: 5}, zeroPadding: true})
  }:${
    equalWidthFormat(`${date.getSeconds()}`, 2, {widthRate: {narrow: 3, wide: 5}, zeroPadding: true})
  }`;
}