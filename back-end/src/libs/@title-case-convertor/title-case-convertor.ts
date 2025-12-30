export async function startCasePreserveUnicode(str: string): Promise<string> {
  if (str) {
    const array = str.trim().split(' ');
    const newArray = array.map((element) => {
      if (element.length > 0) {
        const [firstChar, ...restChars] = [...element];
        return `${firstChar.toUpperCase()}${restChars.join('')}`;
      }
      return element;
    });
    return newArray.join(' ');
  }
  return str;
}
