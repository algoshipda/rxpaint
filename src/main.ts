import { fromEvent, of } from 'rxjs';
import { webSocket } from 'rxjs/webSocket';
import { pluck, merge, mapTo, switchMap, filter, takeUntil, startWith, map, bufferCount, distinctUntilChanged, withLatestFrom } from 'rxjs/operators';
import { zip } from 'lodash';

import { host } from './config';

interface IDrawEvent {
  x: number;
  y: number;
};

interface IAppState {
  color: string;
  width: number;
}

window.onload = function () {
  const $cvs: HTMLCanvasElement = document.querySelector('.canvas');
  const ctx: CanvasRenderingContext2D = $cvs.getContext('2d');

  const $colors = document.querySelectorAll('.col');


  zip($colors, ['black', 'red', 'green', 'blue'])
    .forEach(([$el, color]: [HTMLElement, string]) => {
      $el.style.backgroundColor = color;
      fromEvent($el, 'click').subscribe(() => {
        ctx.strokeStyle = color;
      })
    })
  ctx.strokeStyle = 'black';
  ctx.lineCap = 'round';

  const soc = webSocket(host);
  soc.subscribe();
  const mouseDown$ = fromEvent($cvs, 'mousedown');
  const mouseUp$ = fromEvent($cvs, 'mouseup');
  const mouseMove$ = fromEvent($cvs, 'mousemove');
  const isCtrl = (e: KeyboardEvent) => e.keyCode === 17;
  const ctrlKeyDown$ = fromEvent(window, 'keydown')
    .pipe(
      filter(isCtrl));
  const ctrlKeyUp$ = fromEvent(window, 'keyup')
    .pipe(filter(isCtrl));
  const ctrlPressing$ = ctrlKeyDown$
    .pipe(
      mapTo(true),
      merge(ctrlKeyUp$.pipe(mapTo(false))),
      startWith(false),
      distinctUntilChanged(),
    );
  const draw$ = mouseDown$
    .pipe(
      switchMap((e) => {
        return mouseMove$
          .pipe(
            startWith(e),
            takeUntil(mouseUp$),
            map(({ offsetX, offsetY }: MouseEvent) => ({ x: offsetX, y: offsetY })),
            bufferCount(2, 1),
          );
      }),
      withLatestFrom(ctrlPressing$),
    )

  const clear$ = fromEvent(document.querySelector('button'), 'click');

  const line = ([e1, e2]: IDrawEvent[], color: string) => {
    const prvColor = ctx.strokeStyle;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(e1.x, e1.y);
    ctx.lineTo(e2.x, e2.y);
    ctx.stroke();
    ctx.strokeStyle = prvColor;
  }

  const erase = ([e1, e2]: IDrawEvent[]) => {
    const prvColor = ctx.strokeStyle;
    const prvWidth = ctx.lineWidth;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 50;

    ctx.beginPath();
    ctx.moveTo(e1.x, e1.y);
    ctx.lineTo(e2.x, e2.y);
    ctx.stroke();
    ctx.strokeStyle = prvColor;
    ctx.lineWidth = prvWidth;
  };

  const clear = () => {
    ctx.clearRect(0, 0, $cvs.width, $cvs.height);
  }

  draw$.subscribe(([[e1, e2], t]: [IDrawEvent[], boolean]) => {
    if (!e2) return;
    if (!t) {
      line([e1, e2], ctx.strokeStyle as string);
      soc.next({
        type: 'line',
        data: {
          pos: [e1, e2],
          color: ctx.strokeStyle,
        }
      });
    } else {
      erase([e1, e2]); 
      soc.next({
        type: 'erase',
        data: {
          pos: [e1, e2],
        }
      });
    }
  })

  clear$.subscribe(() => {
    clear();
    soc.next({
      type: 'clear'
    });
  });

  interface SocketPacket {
    type: string;
    data: any;
  }

  soc.subscribe((msg: SocketPacket) => {
    if (msg.type === 'line') {
      line(msg.data.pos, msg.data.color);
    }
    if (msg.type === 'clear') {
      clear();
    }
    if (msg.type === 'erase') {
      erase(msg.data.pos);
    }
  });
}