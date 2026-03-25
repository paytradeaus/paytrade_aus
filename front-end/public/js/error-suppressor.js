(function(){
  var blocked=['cookiebot','googletagmanager','gtag/js','consent.cookiebot','js.stripe.com'];
  function isThirdParty(s){for(var i=0;i<blocked.length;i++){if(s.indexOf(blocked[i])!==-1)return true;}return false;}
  window.addEventListener('error',function(e){
    var s=e.filename||'';
    if(s&&isThirdParty(s)){e.preventDefault();e.stopImmediatePropagation();return false;}
    if(!e.error){e.preventDefault();e.stopImmediatePropagation();return false;}
  },true);
  window.addEventListener('unhandledrejection',function(e){
    if(!e.reason||!(e.reason instanceof Error)){e.preventDefault();e.stopImmediatePropagation();return false;}
  },true);
})();
