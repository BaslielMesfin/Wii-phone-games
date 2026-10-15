export class AudioEngine {
 constructor(){this.muted=localStorage.getItem('apex-muted')==='true';}
 init(){if(!this.ctx){this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.gain=this.ctx.createGain();this.gain.gain.value=0;this.gain.connect(this.ctx.destination);this.osc=this.ctx.createOscillator();this.osc.type='sawtooth';this.filter=this.ctx.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=240;this.osc.connect(this.filter);this.filter.connect(this.gain);this.osc.start();}this.ctx.resume();}
 setMuted(value){this.muted=value;localStorage.setItem('apex-muted',value);if(value&&this.gain)this.gain.gain.value=0;}
 update(speed,gas,racing){if(!this.ctx)return;this.osc.frequency.setTargetAtTime(45+speed*3.3,this.ctx.currentTime,.1);this.gain.gain.setTargetAtTime(this.muted||!racing?0:gas?.021:.009,this.ctx.currentTime,.1);}
 beep(freq=500,duration=.12){if(this.muted||!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.frequency.value=freq;g.gain.value=.065;o.connect(g);g.connect(this.ctx.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,this.ctx.currentTime+duration);o.stop(this.ctx.currentTime+duration);}
}
