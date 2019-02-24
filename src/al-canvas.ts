
export default class AlCanvas {
  private $cvs: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  constructor($canvas: HTMLCanvasElement) {
    this.$cvs = $canvas;
    this.ctx = $canvas.getContext('2d');
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = 'black';
  }

  public draw(from: IPosition, to: IPosition, color: string, width: number): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();
  }

  public erase(from: IPosition, to: IPosition, width: number = 50): void {
    this.draw(from, to, '#FFF', width);
  }

  public clear() {
    this.ctx.clearRect(0, 0, this.$cvs.width, this.$cvs.height);
  }
}
