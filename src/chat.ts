import soc from './socket';
import { fromEvent, merge } from 'rxjs';
import { filter } from 'rxjs/operators';

function scrollToBottom($el: HTMLElement) {
  $el.scrollTop = $el.scrollHeight;
}

function createLog ($log: HTMLDivElement) {
  return (nick: string, msg: string, my: boolean = false) => {
    const $wrapper = document.createElement('div');
    const $msgBox = document.createElement('div');
    const $nicknameBox = document.createElement('div');
    const $innerWrapper = document.createElement('div');

    $wrapper.className = 'rxpaint-message-box-wrapper';
    $nicknameBox.className = 'rxpaint-message-box-nickname';
    $nicknameBox.innerHTML = nick;

    if (my) {
      $msgBox.classList.add('rxpaint-message-box', 'rxpaint-message-box-my');
      $wrapper.classList.add('rxpaint-message-box-wrapper-my');
      $nicknameBox.classList.add('my');
    } else {

      $msgBox.classList.add('rxpaint-message-box', 'rxpaint-message-box-your');
    }
    $msgBox.innerHTML = msg;
    $innerWrapper.appendChild($nicknameBox);
    $innerWrapper.appendChild($msgBox);

    $wrapper.appendChild($innerWrapper);


    $log.appendChild($wrapper);
    scrollToBottom($log);
  };
}


export default function ChatApp($chatApp: HTMLDivElement) {
  const $messageLog: HTMLDivElement = $chatApp.querySelector('.rxpaint-message-log');
  const $input: HTMLInputElement = $chatApp.querySelector('.rxpaint-chat-input');
  const $sendButton: HTMLButtonElement = $chatApp.querySelector('.rxpaint-chat-send-button');
  const $nickname: HTMLInputElement = $chatApp.querySelector('.rxpaint-chat-nickname-input');

  const log = createLog($messageLog);

  const pressEnter$ = fromEvent($input, 'keydown')
    .pipe(
      filter((evt: KeyboardEvent) => {
        return evt.key === 'Enter'
      }),
    );

  const clickSend$ = fromEvent($sendButton, 'click');
  const send$ = merge(pressEnter$, clickSend$);

  send$.subscribe(() => {
    const val = $input.value;
    const nick = $nickname.value;
    if (val.trim().length > 0 && nick.trim().length > 0) {
      log(nick, val, true);
      soc.next({
        type: 'chat',
        data: [nick, val],
      });
      $input.value = '';
    }
  });

  soc.subscribe((msg: pushedData) => {
    console.log('asdf', msg);
    switch(msg.type) {
      case 'chat':
        log(msg.data[0], msg.data[1]);
        break;
    }
  });
}
