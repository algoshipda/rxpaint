import { webSocket } from 'rxjs/webSocket';

const soc = webSocket((window as any).__ws__);
soc.subscribe();

export default soc;
