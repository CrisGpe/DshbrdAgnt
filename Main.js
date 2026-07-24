function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  template.urlParams = (e && e.parameter) ? JSON.stringify(e.parameter) : '{}';
  return template
    .evaluate()
    .setTitle('Workerview - Dashboard')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}