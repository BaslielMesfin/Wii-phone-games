const app=document.querySelector('#app');
const params=new URLSearchParams(location.search);
const controller=params.has('join')||params.has('controller');
const timeout=setTimeout(()=>{if(document.querySelector('.loading'))document.querySelector('.loading p').textContent='Still loading. Try refreshing in Chrome or Edge. Phone pairing requires internet access.';},12000);
import(controller?'./phone.js':'./host.js').then(m=>{clearTimeout(timeout);m.start(app);}).catch(e=>{clearTimeout(timeout);console.error(e);app.innerHTML='<main class="loading"><b>APEX / POCKET</b><h1>Couldn’t start the engine.</h1><p>Check your internet connection and refresh. Open this page through a web server, rather than double-clicking the HTML file.</p><button onclick="location.reload()">Try again</button></main>';});
