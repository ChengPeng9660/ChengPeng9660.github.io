'use strict';
(() => {
/* 复用原工程的本地合成音乐。 */
 class GardenSound{
  constructor(){this.ctx=null;this.master=null;this.musicBus=null;this.effectBus=null;this.timer=null;this.volume=.32;this.theme='garden';this.n=0;this.nextTime=0;this.active=new Set();this.sfxEnabled=true;this.wantMusic=false;}
  async init(){
   if(!this.ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)throw new Error('Audio unavailable');this.ctx=new C();this.master=this.ctx.createGain();this.master.gain.value=this.volume;this.master.connect(this.ctx.destination);this.musicBus=this.ctx.createGain();this.effectBus=this.ctx.createGain();this.musicBus.connect(this.master);this.effectBus.connect(this.master);}
   if(this.ctx.state==='suspended')await this.ctx.resume();
  }
  note(freq,duration=.4,amp=.12,type='sine',at=null,bus='effect'){
   if(!this.ctx||this.ctx.state!=='running'||(bus==='effect'&&!this.sfxEnabled))return;
   const t=at??this.ctx.currentTime;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);
   g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,amp),t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
   o.connect(g);g.connect(bus==='music'?this.musicBus:this.effectBus);const voice={o,g,bus};this.active.add(voice);
   o.onended=()=>{try{o.disconnect();g.disconnect();}catch{}this.active.delete(voice);};o.start(t);o.stop(t+duration+.03);
  }
  schedule(){
   if(!this.ctx||this.ctx.state!=='running'||document.hidden)return;
   if(this.nextTime<this.ctx.currentTime-.5)this.nextTime=this.ctx.currentTime+.06;
   const warm=[72,null,76,79,76,null,74,72,69,null,72,76,74,72,69,null,72,null,74,77,76,null,74,72,71,null,74,79,76,74,72,null];
   const mystery=[69,null,72,76,74,null,72,69,67,null,71,74,72,null,71,67,65,null,69,72,74,null,72,69,67,null,71,74,76,74,72,null];
   const melody=this.theme==='clue'?mystery:warm;const chords=this.theme==='clue'?[[45,52,57,60],[43,50,55,59],[41,48,53,57],[43,50,55,59]]:[[48,55,60,64],[45,52,57,60],[41,48,53,57],[43,50,55,59]];
   const tick=this.theme==='clue'?.37:.34;const hz=(m)=>440*2**((m-69)/12);
   while(this.nextTime<this.ctx.currentTime+.22){const pos=this.n%32,note=melody[pos],ch=chords[Math.floor(pos/8)];if(note!==null){this.note(hz(note),.72,.115,'sine',this.nextTime,'music');this.note(hz(note)*2,.32,.012,'sine',this.nextTime,'music');}
    if(pos%2===0)this.note(hz(ch[1+(Math.floor(pos/2)%3)]),1.1,.035,'triangle',this.nextTime,'music');
    if(pos%8===0)this.note(hz(ch[0]),2.1,.11,'sine',this.nextTime,'music');this.n++;this.nextTime+=tick;}
  }
  async start(){this.wantMusic=true;await this.init();if(!this.wantMusic||this.timer)return;this.nextTime=this.ctx.currentTime+.07;this.schedule();this.timer=setInterval(()=>this.schedule(),90);}
  stop(){this.wantMusic=false;clearInterval(this.timer);this.timer=null;for(const v of [...this.active])if(v.bus==='music'){try{v.g.gain.cancelScheduledValues(this.ctx.currentTime);v.g.gain.setTargetAtTime(.0001,this.ctx.currentTime,.02);v.o.stop(this.ctx.currentTime+.08);}catch{}}}
  async setTheme(name){this.theme=name;this.n=0;const on=!!this.timer;this.stop();if(on)await this.start();}
  setVolume(v){this.volume=Math.max(0,Math.min(.6,v));if(this.master)this.master.gain.setTargetAtTime(this.volume,this.ctx.currentTime,.04);}
  good(){const t=this.ctx?.currentTime||0;this.note(523.25,.34,.21,'sine',t);this.note(659.25,.46,.18,'sine',t+.13);this.note(783.99,.5,.11,'sine',t+.27);}
  wrong(){this.note(293.66,.24,.15);this.note(261.63,.24,.10,'sine',(this.ctx?.currentTime||0)+.11);}
  click(){this.note(783.99,.11,.12);}
  peck(){const t=this.ctx?.currentTime||0;for(let i=0;i<4;i++)this.note(130+i*7,.06,.16,'triangle',t+i*.19);}
  frog(){const t=this.ctx?.currentTime||0;this.note(146.83,.16,.17,'triangle',t);this.note(196,.2,.12,'triangle',t+.15);}
  fanfare(){const t=this.ctx?.currentTime||0;[523,659,784,1047].forEach((f,i)=>this.note(f,.7,.18,'sine',t+i*.2));}
  destroy(){this.stop();if(this.ctx)this.ctx.close().catch(()=>{});this.ctx=null;}
 }
window.GardenSound=GardenSound;

})();
