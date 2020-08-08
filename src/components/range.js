export function range(start, end, step = 1, fromRight = false) {
  let index = -1,
    length = Math.max(Math.ceil((end - start) / step), 0),
    result = Array(length);

  while (length--) {
    result[fromRight ? length : ++index] = start;
    start += step;
  }
  return result;
}
