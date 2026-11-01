export class LocalMp3Source {
  constructor() { this.buffers = new Map(); this.pending = new Map(); this.fileNames = new Map(); this.versions = new Map(); }
  async prepare(ctx, id, url) {
    if(this.buffers.has(id)) return this.buffers.get(id);
    if(!this.pending.has(id)) this.pending.set(id, (async () => {
      const version=this.versions.get(id);
      const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),60000);
      try { const r = await fetch(url,{signal:controller.signal}); if(!r.ok) return null; const buffer = await ctx.decodeAudioData(await r.arrayBuffer()); if(this.versions.get(id)!==version) return this.buffers.get(id)||null; this.buffers.set(id,buffer); return buffer; }
      catch { return null; } finally { clearTimeout(timeout); this.pending.delete(id); }
    })());
    return this.pending.get(id);
  }
  async mount(ctx,id,file) {
    const version=(this.versions.get(id)||0)+1; this.versions.set(id,version);
    try {
      const b = await ctx.decodeAudioData(await file.arrayBuffer());
      if(this.versions.get(id)!==version)return false;
      this.buffers.set(id,b); this.fileNames.set(id,file.name||'本地 MP3'); return true;
    }
    catch { if(this.versions.get(id)===version){this.buffers.set(id,null);this.fileNames.delete(id);} return false; }
  }
  play(ctx,output,buffer,loop,onended) {
    const node=ctx.createBufferSource(); node.buffer=buffer; node.loop=loop; node.connect(output); node.onended=onended; node.start();
    return { set loop(v) { node.loop=v; }, stop() { node.onended=null; try { node.stop(); } catch {} node.disconnect(); } };
  }
}
