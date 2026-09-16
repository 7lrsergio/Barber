(() => {
  document.getElementById('shopName').textContent=CONFIG.business.name;
  document.getElementById('hours').textContent=`Abierto de ${T.toLabel(T.toMin(CONFIG.hours.open))} a ${T.toLabel(T.toMin(CONFIG.hours.close))}. Elige, encuentra tu horario y confirma.`;
  const note=document.getElementById('modeNote');
  note.hidden=!CONFIG.useMockData;
  note.textContent='Modo demostración · Horarios de ejemplo. No se crean citas reales.';
  let navigating=false;
  for(const [i,service] of CONFIG.services.entries()) {
    const button=document.createElement('button');
    button.type='button';button.className='service';
    button.setAttribute('aria-pressed',String(API.getService()?.id === service.id));
    button.innerHTML=`<span class="service__number">0${i+1}</span><span class="service__name"></span><span class="service__price"></span><span class="service__desc"></span><span class="service__bottom"><span class="service__duration">${service.minutes} MIN</span><span>Agenda tu cita <span aria-hidden="true">↗</span></span></span>`;
    button.querySelector('.service__name').textContent=service.name;
    button.querySelector('.service__price').textContent=`$${service.price}`;
    button.querySelector('.service__desc').textContent=service.description;
    button.addEventListener('click',async()=>{
      if(navigating)return;
      navigating=true; API.setService(service);
      button.setAttribute('aria-pressed','true');
      const availability=API.getAvailableTimes();
      availability.catch(()=>{});
      // Keep the running request alive as page 2 appears; its API call shares this promise.
      // The two HTML pages also work independently on refresh and direct navigation.
      try {
        const response=await fetch('agenda.html');
        if(!response.ok)throw new Error('Page missing');
        const doc=new DOMParser().parseFromString(await response.text(),'text/html');
        doc.querySelectorAll('script').forEach(s=>s.remove());
        document.title=doc.title;
        document.body.replaceWith(doc.body);
        history.pushState({},'', 'agenda.html');
        window.scrollTo(0,0);
        const script=document.createElement('script');script.src='page-agenda.js?v=3';document.body.appendChild(script);
      } catch {
        // Double-clicking index.html (file://) cannot fetch local HTML on some browsers.
        await availability.catch(()=>{});
        location.href='agenda.html';
      }
    });
    document.getElementById('board').appendChild(button);
  }
  window.addEventListener('popstate',()=>location.reload());
  window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
})();
