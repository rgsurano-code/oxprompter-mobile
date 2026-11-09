export const KEY='tp_data_v1';
export const DEFAULTS={theme:'dark',mirror:false,font:48,speed:1,textWidthPct:.84,mode:'noaudio',micDeviceId:'',cameraDeviceId:'',timerOn:true,target:'00:05:00',runnerOn:true,count:5,recordOn:true,recordAudioOn:true,mobileCameraBg:true,mobileCameraFacing:'user',mobileRecordOrientation:'portrait',recordResolution:'auto',recordFps:'auto',mobileTextOpacity:90,startPercent:40,startCmds:[]};
const clamp=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.min(max,Math.max(min,Number(v))):fallback;
export function settings(raw={}) {
 const s={...DEFAULTS};for(const key of Object.keys(s))if(Object.hasOwn(raw,key))s[key]=raw[key];
 for(const key of ['mirror','timerOn','runnerOn','recordOn','recordAudioOn','mobileCameraBg'])s[key]=s[key]===true;
 s.font=clamp(s.font,24,96,48);s.speed=clamp(s.speed,.2,3,1);s.textWidthPct=clamp(s.textWidthPct,.6,1,.84);s.count=Math.round(clamp(s.count,1,60,5));s.mobileTextOpacity=clamp(s.mobileTextOpacity,35,100,90);s.startPercent=clamp(s.startPercent,15,75,40);
 for(const [key,allowed] of Object.entries({theme:['dark','white'],mode:['noaudio','audio','semi'],mobileCameraFacing:['user','environment'],mobileRecordOrientation:['portrait','landscape'],recordResolution:['auto','720','1080','2160'],recordFps:['auto','30','60']}))if(!allowed.includes(s[key]))s[key]=DEFAULTS[key];
 s.startCmds=Array.isArray(s.startCmds)?s.startCmds.filter(c=>typeof c?.phrase==='string').slice(0,8).map(c=>({phrase:c.phrase.slice(0,120)})):[];
 s.cameraDeviceId=typeof s.cameraDeviceId==='string'?s.cameraDeviceId:'';s.micDeviceId=typeof s.micDeviceId==='string'?s.micDeviceId:'';
 return s;
}
export function parseTime(value){const a=String(value).split(':').map(Number);return a.length===3&&a.every(Number.isFinite)&&a.every(n=>n>=0)&&a[1]<60&&a[2]<60?a[0]*3600+a[1]*60+a[2]:0;}
export function clock(seconds){seconds=Math.max(0,Math.floor(seconds));return [Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(n=>String(n).padStart(2,'0')).join(':');}
export function normalize(text){return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();}
export class Store {
 constructor(storage=localStorage){this.storage=storage;this.blocked=false;this.data={passwordHash:'',scripts:[],settings:{}};let raw;try{raw=storage.getItem(KEY)}catch(_){this.blocked=true;return;}if(raw){try{const d=JSON.parse(raw);if(!d||!Array.isArray(d.scripts)||!d.scripts.every(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&typeof x.text==='string'))throw Error();this.data={...d,passwordHash:typeof d.passwordHash==='string'?d.passwordHash:'',scripts:d.scripts.filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&typeof x.text==='string'),settings:d.settings&&typeof d.settings==='object'?d.settings:{}};}catch(_){this.blocked=true;}}}
 save(){if(this.blocked)throw Error('Os dados antigos estão ilegíveis e foram preservados. Exporte os dados brutos antes de continuar.');try{this.storage.setItem(KEY,JSON.stringify(this.data));}catch(_){throw Error('O navegador não conseguiu salvar. Exporte um backup antes de fechar.');}}
 importBackup(value){if(!Array.isArray(value?.scripts)||value.scripts.length>1000)throw Error('Backup inválido ou acima de 1.000 roteiros.');const scripts=value.scripts.map(x=>{if(typeof x?.name!=='string'||typeof x?.text!=='string'||x.text.length>2000000)throw Error('Roteiro inválido no backup.');return {id:crypto.randomUUID(),name:x.name.slice(0,240),text:x.text,notes:typeof x.notes==='string'?x.notes:'',updated:Date.now(),settings:settings(x.settings)}});this.data.scripts.push(...scripts);try{this.save()}catch(error){this.data.scripts.splice(-scripts.length,scripts.length);throw error;}return scripts.length;}
}
export async function hash(password){if(!crypto.subtle)throw Error('Abra por HTTPS ou localhost para usar a senha.');return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(password))),n=>n.toString(16).padStart(2,'0')).join('');}
