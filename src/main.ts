import { fromEvent } from 'rxjs';
import { webSocket } from 'rxjs/webSocket';
import { merge, mapTo, switchMap,
  filter, takeUntil, startWith, map,
  bufferCount, distinctUntilChanged,
  withLatestFrom } from 'rxjs/operators';

import AlCanvas from './al-canvas';

import { host } from './config';

window.onload = function () {
  let stColor = 'black';
  let stWidth = 5;
  const $cvs: HTMLCanvasElement = document.querySelector('.canvas');
  const canvas = new AlCanvas($cvs);

  const colorRect = (color: string) => {
    const div = document.createElement('div');
    Object.assign(div.style, {
      width: '50px',
      height: '50px',
      border: '1px solid black',
      backgroundColor: color,
    });
    div.classList.add('col');
    return div;
  };

  ['black', 'red', 'green', 'blue']
    .forEach((color: string) => {
      const $el = colorRect(color);
      document.querySelector('.color-bar').appendChild($el); 
      fromEvent($el, 'click').subscribe(() => {
        stColor = color;
        (document.querySelector('.current-color') as HTMLElement).style.backgroundColor = color;
      })
    })

  const soc = webSocket(host);
  soc.subscribe();
  const mouseDown$ = fromEvent($cvs, 'mousedown');
  const mouseUp$ = fromEvent($cvs, 'mouseup');
  const mouseMove$ = fromEvent($cvs, 'mousemove');

  const isCtrl = (e: KeyboardEvent) => e.keyCode === 17;
  const ctrlKeyDown$ = fromEvent(window, 'keydown').pipe(filter(isCtrl));
  const ctrlKeyUp$ = fromEvent(window, 'keyup').pipe(filter(isCtrl));

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
            map(({ offsetX, offsetY }: MouseEvent): IPosition => ({ x: offsetX, y: offsetY })),
            bufferCount(2, 1),
          );
      }),
      filter((arr: IPosition[]) => arr.length >= 2),
      withLatestFrom(ctrlPressing$),
    );

  const clear$ = fromEvent(document.querySelector('button'), 'click');

  draw$.subscribe(([[e1, e2], isErase]: [IPosition[], boolean]) => {
    if (!isErase) {
      canvas.draw(e1, e2, stColor, stWidth);
      soc.next({
        type: 'line',
        data: {
          pos: [e1, e2],
          color: stColor,
        }
      });
    } else {
      canvas.erase(e1, e2);
      soc.next({
        type: 'erase',
        data: {
          pos: [e1, e2],
        }
      });
    }
  });

  clear$.subscribe(() => {
    canvas.clear();
    soc.next({
      type: 'clear'
    });
  });

  interface pushedData {
    type: string;
    data: any;
  }

  soc.subscribe((msg: pushedData) => {
    if (msg.type === 'line') {
      canvas.draw(msg.data.pos[0], msg.data.pos[1], msg.data.color, stWidth);
    }
    if (msg.type === 'clear') {
      canvas.clear();
    }
    if (msg.type === 'erase') {
      canvas.erase(msg.data.pos[0], msg.data.pos[1]);
    }
  });
}