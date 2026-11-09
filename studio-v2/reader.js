import {clock,parseTime} from './store.js';
export class Reader {
 constructor({element,viewport,guide,onTick=()=>{},requestFrame=cb=>requestAnimationFrame(cb),cancelFrame=id=>cancelAnimationFrame(id)}){Object.assign(this,{element,viewport,guide,onTick,requestFrame,cancelFrame});this.running=false;this.frame=null;this.elapsed=0;this.y=0;this.startY=0;this.endY=0;this.dragging=false;this.last=0;this.voiceActive=false;}
 configure(settings){this.settings=settings;this.element.style.fontSize=settings.font+'px';this.element.style.width=settings.textWidthPct*100+'%';this.element.style.opacity=settings.mobileTextOpacity/100;this.resize();}
 resize(){const range=this.startY-this.endY;const progress=range>0?Math.min(1,Math.max(0,(this.startY-this.y)/range)):0;this.startY=this.viewport.clientHeight*(this.settings?.startPercent||40)/100;this.endY=Math.min(this.startY,this.startY-this.element.scrollHeight);this.y=this.startY-progress*(this.startY-this.endY);if(this.guide)this.guide.style.top=(this.settings?.startPercent||40)+'%';this.draw();}
 draw(){this.element.style.transform='translateX(-50%) translateY('+this.y+'px)'+(this.settings?.mirror?' scaleX(-1)':'');}
 begin(){this.stop();this.elapsed=0;this.y=this.startY;this.running=true;this.paused=false;this.last=0;this.loop();}
 loop(){this.frame=this.requestFrame(time=>{if(!this.running)return;const dt=this.last?Math.max(0,time-this.last):0;this.last=time;if(!this.paused){this.elapsed+=dt;if(!this.dragging&&(this.settings.mode==='noaudio'||this.voiceActive)){this.y=Math.max(this.endY,this.y-Math.min(dt,100)/1000*26*this.settings.speed);this.draw();}}this.onTick({elapsed:this.elapsed/1000,text:clock(this.elapsed/1000),over:!!parseTime(this.settings.target)&&this.elapsed/1000>parseTime(this.settings.target),ended:this.y<=this.endY});this.loop();});}
 pause(value){this.paused=value;this.last=0;}
 move(delta){this.y=Math.max(this.endY,Math.min(this.startY,this.y+delta));this.draw();}
 stop(){this.running=false;if(this.frame!==null)this.cancelFrame(this.frame);this.frame=null;this.last=0;}
}
