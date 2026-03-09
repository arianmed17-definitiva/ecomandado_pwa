// chat.js - cliente de chatbot simple con modo local y soporte para proxy
(function () {
  const storageKey = 'pwa_chat_history_v1';
  const proxyKey = 'pwa_chat_proxy_url_v1';

  const $ = (id) => document.getElementById(id);
  const messagesEl = $('messages');
  const inputEl = $('chatInput');
  const sendBtn = $('sendBtn');
  const settingsBtn = $('openSettings');
  const settingsBox = $('chatSettings');
  const proxyInput = $('proxyUrl');
  const saveProxy = $('saveProxy');
  const clearProxy = $('clearProxy');
  const chatModeEl = $('chatMode');

  let messages = [];

  function escapeHtml(text){ return text.replace(/[&<>"']/g, (c)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }

  function loadState(){
    try{
      const raw = localStorage.getItem(storageKey);
      messages = raw ? JSON.parse(raw) : [];
    }catch(e){ messages = []; }
    const proxy = localStorage.getItem(proxyKey) || '';
    proxyInput.value = proxy;
    updateModeDisplay(!!proxy);
  }

  function saveState(){ localStorage.setItem(storageKey, JSON.stringify(messages)); }

  function updateModeDisplay(hasProxy){ chatModeEl.textContent = hasProxy ? 'Proxy' : 'Local'; }

  function render(){
    messagesEl.innerHTML = '';
    messages.forEach(m => {
      const div = document.createElement('div');
      div.className = 'message ' + (m.role === 'user' ? 'user' : 'bot');
      div.innerHTML = escapeHtml(m.text).replace(/\n/g, '<br>');
      messagesEl.appendChild(div);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function append(role, text){ messages.push({role, text, ts: Date.now()}); saveState(); render(); }

  function delay(ms){ return new Promise(r=>setTimeout(r,ms)); }

  function localBotResponse(text){
    const t = text.toLowerCase();
    if (/pedido|llegar|no llegó|no llego|envío|envio/.test(t)){
      return 'Lamento la demora. Revisa "Mis pedidos" y contacta soporte con tu número de pedido si no hay actualización.';
    }
    if (/reembolso|devolver|devolución|reembolsar/.test(t)){
      return 'Para un reembolso, abre tu pedido, selecciona "Solicitar reembolso" y sigue las instrucciones. Podemos ayudarte si contactas a soporte.';
    }
    if (/crear cuenta|registr|registro/.test(t)){
      return 'Puedes crear una cuenta desde la pantalla de registro introduciendo tu nombre, correo y contraseña. Verifica tu correo electrónico para activar la cuenta.';
    }
    return 'Puedo ayudarte con pedidos, reembolsos y cuentas. Para respuestas más avanzadas configura un servidor proxy en Ajustes.';
  }

  async function sendMessage(){
    const text = inputEl.value.trim();
    if (!text) return;
    append('user', text);
    inputEl.value = '';
    // show typing indicator
    append('bot', 'Escribiendo...');
    messagesEl.lastChild.classList.add('typing');

    const proxyUrl = localStorage.getItem(proxyKey);
    let botReply = '';
    if (proxyUrl){
      try{
        const resp = await fetch(proxyUrl, {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({message: text, history: messages})
        });
        const data = await resp.json();
        botReply = data.reply || (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || JSON.stringify(data);
      }catch(e){ botReply = 'Error al conectar con el proxy: ' + (e.message||e); }
    } else {
      await delay(600);
      botReply = localBotResponse(text);
    }

    // replace last bot typing message
    messages.pop();
    append('bot', botReply);
  }

  // Events
  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keydown', (e)=>{ if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

  settingsBtn.addEventListener('click', ()=>{ settingsBox.style.display = settingsBox.style.display === 'none' ? 'block' : 'none'; });
  saveProxy.addEventListener('click', ()=>{
    const v = proxyInput.value.trim();
    if (v) localStorage.setItem(proxyKey, v); else localStorage.removeItem(proxyKey);
    updateModeDisplay(!!v);
    settingsBox.style.display = 'none';
    alert('Proxy guardado.');
  });
  clearProxy.addEventListener('click', ()=>{ proxyInput.value = ''; localStorage.removeItem(proxyKey); updateModeDisplay(false); alert('Proxy eliminado, usando modo local.'); });

  // Initialize
  loadState(); render();

  // If no messages yet, greet
  if (messages.length === 0){ append('bot', 'Hola 👋 — soy tu asistente. Escribe algo o usa Ajustes para conectar un proxy de IA.'); }

})();
