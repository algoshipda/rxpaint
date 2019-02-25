
export function toPositionByOffset({offsetX, offsetY}: MouseEvent): IPosition {
  return {
    x: offsetX,
    y: offsetY,
  };
}