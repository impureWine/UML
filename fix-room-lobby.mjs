import fs from 'node:fs';
const path='src/view/GameView.js';let s=fs.readFileSync(path,'utf8');
const a=s.indexOf("    this.root.addEventListener('click',async e=>{const b=e.target.closest('[data-room],[data-debug-unlock]')");
const b=s.indexOf('\n    this.unsubscribe =',a);
if(a<0||b<0)throw Error('Room listener not found');
s=s.slice(0,a)+`    this.root.addEventListener('click', async e => {
      const button = e.target.closest('[data-room],[data-debug-unlock]');
      if (!button || button.disabled) return;
      try {
        if (button.dataset.debugUnlock) await game.setFusionTestUnlock(button.dataset.debugUnlock === 'yes');
        else await this.handleRoomAction(button.dataset.room);
      } catch (error) {
        const output = this.main.querySelector('[data-settings-error]');
        if (output) output.textContent = error.message;
        else { game.state.storageError = error.message; game.emit(); }
      }
    }, { signal: this.events.signal });`+s.slice(b);
s=s.replace(' renderOnline(){',` async handleRoomAction(action) {
   const network = this.game.ensureNetwork();
   // Network operations emit the current state. Their async completion must not
   // redraw a lobby over a match that has already started in the meantime.
   if (action === 'create') await network.create();
   else if (action === 'join') await network.join(this.main.querySelector('[data-room-code]').value.trim());
   else if (action === 'ready') await network.ready();
   else if (action === 'leave') { network.send('leave', {}); await network.disconnected(); }
 }
 renderOnline(){
 const snapshot=this.game.getSnapshot();
 if(snapshot.page!=='online'||snapshot.setup)return;`);
fs.writeFileSync(path,s);
