// ✅ 这是远程服务器上的 script_loader.js
// ✅ 登录成功后 fetch 到的内容将是这段脚本字符串

(async function main() {
  'use strict';

  let isBuying = false;

  function realMouseClick(el) {
    const evt = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    el.dispatchEvent(evt);
  }

  function autoBuy(priceWei, quantity) {
    try {
      const input = document.querySelector('#consumable-buy-form input');
      if (!input) return;

      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeInputValueSetter.call(input, quantity);
      input.dispatchEvent(new Event('input', { bubbles: true }));

      const buyBtn = document.querySelector('#consumable-buy-form button');
      if (!buyBtn) return;

      const redX = document.querySelector('#insufficient-balance-modal > div > button');
      if (redX && redX.offsetParent !== null && !redX.disabled) {
        redX.click();
        isBuying = false;
        return;
      }

      const greenX = document.querySelector('[id^="b_"] > div > button');
      if (greenX && greenX.offsetParent !== null && !greenX.disabled) {
        greenX.click();
        isBuying = false;
        return;
      }

      setTimeout(() => {
        buyBtn.click();
        let confirmWait = 0;
        const waitConfirm = setInterval(() => {
          const confirmBtn = document.querySelector('#purchase-consumables-modal button');
          if (confirmBtn) {
            clearInterval(waitConfirm);
            setTimeout(() => {
              realMouseClick(confirmBtn);
              setTimeout(() => {
                const stillThere = document.querySelector('#purchase-consumables-modal button');
                if (stillThere && stillThere.offsetParent !== null && !stillThere.disabled) {
                  realMouseClick(stillThere);
                }
              }, 800);
            }, 500);
            setTimeout(() => {
              const closeBtn = document.querySelector('#make-transaction-sign > div > button');
              if (closeBtn && closeBtn.offsetParent !== null && !closeBtn.disabled) {
                closeBtn.click();
              }
              isBuying = false;
            }, 15000);
          } else {
            confirmWait += 500;
            if (confirmWait >= 10000) {
              clearInterval(waitConfirm);
              isBuying = false;
            }
          }
        }, 500);
      }, 300);
    } catch (e) {
      isBuying = false;
    }
  }

  while (true) {
    try {
      if (isBuying) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      const res = await fetch("https://msu.io/marketplace/api/marketplace/explore/consumables/4310403/summaries");
      if (!res.ok || !res.headers.get("content-type")?.includes("json")) {
        await new Promise(r => setTimeout(r, 10000));
        continue;
      }

      const data = await res.json();
      const summaries = data.summaries || [];
      if (summaries.length === 0) {
        // 无挂单
      } else {
        const min = summaries.reduce((a, b) => (BigInt(a.priceWei) < BigInt(b.priceWei) ? a : b));
        const realPrice = Math.round(Number(min.priceWei) / 1e18);
        if (realPrice <= 5500) {
          isBuying = true;
          autoBuy(min.priceWei, min.quantity);
        }
      }
    } catch (e) {
      isBuying = false;
    }
    const delay = 6000 + Math.floor(Math.random() * 1000);
    await new Promise(r => setTimeout(r, delay));
  }
})();
