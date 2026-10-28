(function(){
 if(location.protocol!=='https:'||(location.port&&location.port!=='443')||!['atende.cemig.com.br','www.atende.cemig.com.br'].includes(location.hostname)||!/^\/Login\/?$/i.test(location.pathname))return null;
 if(/Verify you are human|Performing security verification|verification.*expired|verifica[çc][aã]o.*expir/i.test(document.body.innerText))return null;
 var modal=document.querySelector('#modalLoginComSenha');if(!modal||!modal.getClientRects().length)return null;
 var frame=Array.from(modal.querySelectorAll('iframe[src]')).find(function(f){try{var u=new URL(f.src);return u.protocol==='https:'&&['www.google.com','www.recaptcha.net'].includes(u.hostname)&&['/recaptcha/enterprise/anchor','/recaptcha/api2/anchor'].includes(u.pathname);}catch(e){return false;}});
 if(!frame)return null;var u=new URL(frame.src),key=u.searchParams.get('k');if(!/^[a-zA-Z0-9_-]{20,200}$/.test(key||''))return null;
 var widget=modal.querySelector('[data-sitekey]');
 return JSON.stringify({websiteURL:location.origin+location.pathname,websiteKey:key,userAgent:navigator.userAgent,tipo:u.pathname.includes('enterprise')?'RecaptchaV2EnterpriseTask':'RecaptchaV2Task',s:widget&&widget.dataset.s||undefined});
})();
