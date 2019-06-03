import { fromEvent, interval } from 'rxjs';
import soc from './socket';

import Chat from './chat';

import {
  merge, mapTo, switchMap,
  filter, takeWhile, startWith, map,
  bufferCount, distinctUntilChanged,
  withLatestFrom
} from 'rxjs/operators';

import AlCanvas from './al-canvas';

import { colorSet } from './config';

import { toPositionByOffset } from './util';

function chatService() {
  Chat(document.querySelector('.rxpaint-splitter-right-area'));
}

window.onload = function () {
  chatService();
  let stColor = 'black';
  let stWidth = 5;
  const $cvs: HTMLCanvasElement = document.querySelector('.canvas');
  const canvas = new AlCanvas($cvs);
  fromEvent(window, 'keydown')
    .subscribe(console.log);

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

  colorSet.forEach((color: string) => {
    const $el = colorRect(color);
    document.querySelector('.color-bar').appendChild($el);
    fromEvent($el, 'click').subscribe(() => {
      stColor = color;
      (document.querySelector('.current-color') as HTMLElement).style.backgroundColor = color;
      canvas.setColor(color);
    })
  })

  const mouseDown$ = fromEvent($cvs, 'mousedown');
  const mouseUp$ = fromEvent($cvs, 'mouseup');
  const mouseMove$ = fromEvent($cvs, 'mousemove');
  const mouseOut$ = fromEvent($cvs, 'mouseleave');

  mouseOut$.subscribe(console.log);

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


  const done$ = mouseUp$.pipe(merge(mouseOut$), map(toPositionByOffset));

  mouseMove$
    .pipe(
      merge(mouseOut$),
      map(toPositionByOffset)
    )
    .subscribe(({x, y}) => {
      canvas.cursorMoveTo(x, y);  
    });
  
  const draw$ = mouseDown$
    .pipe(
      switchMap((e) => {
        return mouseMove$
          .pipe(
            startWith(e),
            map(toPositionByOffset),
            merge(done$.pipe(map(a => Object.assign({}, a, { done: true })))),
            bufferCount(2, 1),
            takeWhile(([a, _]) => !(a as any).done),
          );
      }),
      withLatestFrom(ctrlPressing$),
    );

  const clear$ = fromEvent(document.querySelector('button'), 'click');

  ctrlPressing$
      .subscribe((eraser) => {
        if (eraser) {
          canvas.setCursorType('eraser');
        } else {
          canvas.setCursorType('pen');
        }
      });

  draw$.subscribe(([[e1, e2], isErase]: [IPosition[], boolean]) => {
    if (!isErase) {
      canvas.draw(e1, e2, stColor, stWidth);
      soc.next({
        type: 'draw',
        data: [e1, e2, stColor, stWidth],
      });
    } else {
      canvas.erase(e1, e2);
      soc.next({
        type: 'erase',
        data: [e1, e2],
      });
    }
  });

  clear$.subscribe(() => {
    canvas.clear();
    soc.next({
      type: 'clear'
    });
  });


  interval(1000 / 60).subscribe(() => canvas.render());

  soc.subscribe((msg: pushedData) => {
    console.log(msg);
    switch(msg.type) {
      case 'draw':
        canvas.draw(...msg.data as [IPosition, IPosition, string, number]);
        break;
      case 'erase':
        canvas.erase(...msg.data as [IPosition, IPosition, number]);
        break;
      case 'clear':
        canvas.clear();
        break;
    }
  });
}