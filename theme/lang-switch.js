/* Language switcher: toggles between /en/ and /ja/ in the URL path */
(function () {
  var link = document.getElementById('lang-switch');
  if (!link) {
    return;
  }

  var path = window.location.pathname;
  var isJa = path.indexOf('/ja/') !== -1;
  var targetPath;

  if (isJa) {
    targetPath = path.replace('/ja/', '/en/');
    link.textContent = 'EN';
    link.title = 'Switch to English';
  } else {
    targetPath = path.replace('/en/', '/ja/');
    link.textContent = 'JA';
    link.title = '日本語に切替';
  }

  link.href = targetPath;
})();
