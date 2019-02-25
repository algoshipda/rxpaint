
interface ITask {
  type: 'draw' | 'erase' | 'clear';
  args: any[];
}

export default class AlCanvas {
  private $cvs: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private img: ImageData;
  private cursorPosition: IPosition;
  private cursorType: 'pen' | 'eraser';
  private currentColor: string;
  private buffer: ITask[];
  constructor($canvas: HTMLCanvasElement) {
    this.$cvs = $canvas;
    this.ctx = $canvas.getContext('2d');
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = 'black';
    this.img = this.ctx.getImageData(...this.getCanvasRect());
    this.cursorType = 'pen';
    this.cursorPosition = {
      x: null,
      y: null,
    }
    this.buffer = [];
    this.currentColor = 'black';
  }

  public getCanvasRect(): [number, number, number, number] {
    return [0, 0, this.$cvs.width, this.$cvs.height];
  }

  public draw(from: IPosition, to: IPosition, color: string, width: number): void {
    this.buffer.push({
      type: 'draw',
      args: [from, to, color, width]
    });
  }

  public erase(from: IPosition, to: IPosition, width: number = 50): void {
    this.buffer.push({
      type: 'draw',
      args: [from, to, '#FFF', width]
    });
  }

  public clear() {
    this.buffer.push({
      type: 'clear',
      args: []
    });
  }

  public cursorMoveTo(x: number, y: number) {
    this.cursorPosition.x = x;
    this.cursorPosition.y = y;
  }

  public setCursorType(type: 'pen' | 'eraser') {
    this.cursorType = type;
  }

  public getImageData() {
    return this.ctx.getImageData(...this.getCanvasRect());
  }

  public setColor(color: string) {
    this.currentColor = color;
  }

  public render() { 
    this.ctx.putImageData(this.img, 0, 0);
    for (let task of this.buffer) {
      if (task.type === 'draw') {
        const [from, to, color, width] = task.args;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
        this.ctx.stroke();
      } else if (task.type === 'clear') {
        this.ctx.clearRect(...this.getCanvasRect());
      }
    }
    this.img = this.getImageData();

    if (this.cursorPosition.x === null) return;
    this.ctx.beginPath();
    const {x, y} = this.cursorPosition;
    const r = this.cursorType === 'pen' ? 5 : 25;
    if (this.cursorType === 'pen') {
      this.ctx.strokeStyle = this.currentColor;
      this.ctx.fillStyle = this.currentColor;
      this.ctx.lineWidth = 5
      this.ctx.arc(x, y, r, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      this.ctx.strokeStyle = 'black';
      this.ctx.lineWidth = 1
      this.ctx.arc(x, y, r, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }
}
