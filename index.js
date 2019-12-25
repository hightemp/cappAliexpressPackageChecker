
const oConfig = require('./config.json');

const oConfigScheme = {
  pochta_ru: {
    login: 'not_empty',
    password: 'not_empty'
  },
  aliexpress: {
    login: 'not_empty',
    password: 'not_empty'
  }
}

function fnExitWithError(sMessage)
{
  console.log('[E] '+sMessage);
  process.exit(1);
}

function fnCheckWithScheme(oObject, oScheme) 
{
  for (var mItem in oScheme) {
    if (!oObject[mItem]) {
      fnExitWithError(`key '${mItem}' not found in config.json`);
    }
    if (typeof oScheme[mItem] != typeof oObject[mItem]) {
      fnExitWithError(`item with key '${mItem}' has value with wrong type in config.json`);
    }
    if (oScheme[mItem] == "not_empty" && !oObject[mItem]) {
      fnExitWithError(`item with key '${mItem}' can't be empty in config.json`);
    }
  }
}

fnCheckWithScheme(oConfig, oConfigScheme);

const puppeteer = require('puppeteer');

async function fnGetAliexpressPostNumbers(oBrowser)
{
  var aResult = [];

  const oAliexpressPage = await oBrowser.newPage();

  await oAliexpressPage.goto('https://ru.aliexpress.com/');
  console.log('fnGetAliexpressPostNumbers https://ru.aliexpress.com/');

  await oAliexpressPage.click('.close-layer');

  // ng-item nav-pinfo-item nav-user-account
  
  await oAliexpressPage.click('.sign-btn');

  await oAliexpressPage.type('#fm-login-id', oConfig.aliexpress.login);
  await oAliexpressPage.type('#fm-login-password', oConfig.aliexpress.password);

  await oAliexpressPage.click('.password-login');
  
  await oAliexpressPage.waitForNavigation();

  await oAliexpressPage.goto('https://trade.aliexpress.com/orderList.htm');
  console.log('fnGetAliexpressPostNumbers https://trade.aliexpress.com/orderList.htm');

  var sPages = await oAliexpressPage.$eval('.ui-pagination.ui-pagination-front.ui-pagination-pager.util-right .ui-label', (i) => i.innerText);

  var aPages = sPages.split('/');

  console.log('fnGetAliexpressPostNumbers aPages', aPages);

  for (var iPage = aPages[0]*1; iPage<aPages[1]*1; iPage++) {
    console.log('fnGetAliexpressPostNumbers iPage', iPage);
    var oOrder = await oAliexpressPage.$$eval(
      '.order-head', 
      (a) => a.map((i) => {
          return {
            sOrderID: i.querySelect('.info-body').innerText,
            sOrderNumber: '',
            sOrderURL: i.querySelect('.view-detail-link').href
          }
        }
      )
    );
    aResult.push(oOrder);
  }

  return aResult;
}

async function fnGetPochtaRuStatusByNumbers(oBrowser, aNumbers)
{
  var oResult = {};

  if (!aNumbers.length) {
    return oResult;
  }

  const oPochtaRuPage = await oBrowser.newPage();

  /*
  await page.tracing.start({
    path: 'trace.json',
    categories: ['devtools.timeline']
  })
  */

  await oPochtaRuPage.goto('https://www.pochta.ru/');

  await oPochtaRuPage.click('.b-header__menu-item--enter');
  await oPochtaRuPage.waitForNavigation();

  await oPochtaRuPage.type('#username', oConfig.pochta_ru.login);
  await oPochtaRuPage.type('#password', oConfig.pochta_ru.password);

  await oPochtaRuPage.click('.button.id-page__button.id-page__main-button');
  await oPochtaRuPage.waitForNavigation();

  await oPochtaRuPage.goto('https://www.pochta.ru/tracking/');
  
  var aArchiveLinkResult = await oPochtaRuPage.$x('//div[contains(text(), "Показать архив")]');
  aArchiveLinkResult[0].click();

  await oPochtaRuPage.$x('//[contains(@class, "TrackingGroup__"):has("")')
  
  
  const stories = await oPochtaRuPage.$$eval('a.storylink', anchors => { return anchors.map(anchor => anchor.textContent).slice(0, 10) })
  console.log(stories)

  return oResult;
}

(async () => {
  const oBrowser = await puppeteer.launch({
    headless: false
  });

  var aNumbers = await fnGetAliexpressPostNumbers(oBrowser);
  console.log('aNumbers', aNumbers);
  // var oPochtaRuStatuses = await fnGetPochtaRuStatusByNumbers(oBrowser, aNumbers);

  //console.log(oPochtaRuStatuses);

  // await page.tracing.stop();
  await oBrowser.close()
})()