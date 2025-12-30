export function parseCommaSeparatedInput(
  input: string | null,
): string[] | number[] {
  if (!input) {
    return [];
  }
  const containsOnlyNumbers = input
    .split(',')
    .every((item) => /^[0-9]+$/.test(item.trim()));
  if (containsOnlyNumbers) {
    // If input contains only numbers, parse them as numbers
    return input.split(',').map((item) => parseFloat(item.trim()));
  } else {
    // Otherwise, parse the input as strings
    return input.split(',').map((item) => item.trim());
  }
}
