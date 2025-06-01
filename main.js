(async function monitor() {
  'use strict';

  let isBuying = false; // 🔒 是否正在交易中

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
    if (!input) return console.warn("❌ 找不到数量输入框");

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(input, quantity);
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const buyBtn = document.querySelector('#consumable-buy-form button');
    if (!buyBtn) return console.warn("❌ 找不到 Buy 按钮");

    // ✅ 红色弹窗：余额不足
    const redX = document.querySelector('#insufficient-balance-modal > div > button');
    if (redX && redX.offsetParent !== null && !redX.disabled) {
      redX.click();
      console.warn("❌ 检测到余额不足弹窗，已点击 X");
      isBuying = false;
      return;
    }

    // ✅ 绿色弹窗：错误提示 Error occurred
    const greenX = document.querySelector('[id^="b_"] > div > button');
    if (greenX && greenX.offsetParent !== null && !greenX.disabled) {
      greenX.click();
      console.warn("❌ 检测到错误弹窗，已点击 X");
      isBuying = false;
      return;
    }

    setTimeout(() => {
      buyBtn.click();
      console.log("🟢 已点击 Buy 按钮");

      // 等待确认按钮
      let confirmWait = 0;
      const waitConfirm = setInterval(() => {
        const confirmBtn = document.querySelector('#purchase-consumables-modal > div > div > div._13upqul3._13upqul1.pbjki00 > button');
        if (confirmBtn) {
          clearInterval(waitConfirm);
          console.log("🟡 尝试点击确认按钮...");

          setTimeout(() => {
            const rect = confirmBtn.getBoundingClientRect();
            realMouseClick(confirmBtn);
            console.log(`✅ 已点击确认按钮，位置: (${Math.floor(rect.x)}, ${Math.floor(rect.y)})`);

            setTimeout(() => {
              const stillThere = document.querySelector('#purchase-consumables-modal > div > div > div._13upqul3._13upqul1.pbjki00 > button');
              if (stillThere && stillThere.offsetParent !== null && !stillThere.disabled) {
                console.warn("⚠️ 再次点击确认按钮");
                realMouseClick(stillThere);
              }
            }, 800);
          }, 500);

          setTimeout(() => {
            const closeBtn = document.querySelector('#make-transaction-sign > div > button');
            if (closeBtn && closeBtn.offsetParent !== null && !closeBtn.disabled) {
              closeBtn.click();
              console.log("🔁 已点击 × 返回购买页面");
            } else {
              console.warn("❌ 找不到 × 按钮或不可见");
            }
            isBuying = false;
          }, 15000);
        } else {
          confirmWait += 500;
          if (confirmWait >= 10000) {
            clearInterval(waitConfirm);
            console.warn("❌ 确认按钮超时未出现");
            isBuying = false;
          }
        }
      }, 500);
    }, 300);
  } catch (e) {
    console.error("❌ autoBuy 异常：", e);
    isBuying = false;
  }
}





  while (true) {
    try {
      if (isBuying) {
        console.log("⏸️ 正在交易中，跳过扫描");
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      const res = await fetch("https://msu.io/marketplace/api/marketplace/explore/consumables/4310403/summaries");
      if (!res.ok || !res.headers.get("content-type")?.includes("json")) {
        console.warn(`⚠️ 请求失败：${res.status}`);
        await new Promise(r => setTimeout(r, 10000));
        continue;
      }

      const data = await res.json();
      const summaries = data.summaries || [];

      if (summaries.length === 0) {
        console.log("⏳ 无挂单");
      } else {
        const min = summaries.reduce((a, b) => (BigInt(a.priceWei) < BigInt(b.priceWei) ? a : b));
        const realPrice = Math.round(Number(min.priceWei) / 1e18);
        console.log(`✅ 最低价：${realPrice} 银币 × 数量：${min.quantity}`);

        if (realPrice <= 5500) {
          console.log(`🔥 满足条件自动购买！价格：${realPrice} × ${min.quantity}`);
          isBuying = true;
          autoBuy(min.priceWei, min.quantity);
        }
      }
    } catch (e) {
      console.error("❌ 主循环异常：", e.message);
      isBuying = false;
    }

    const delay = 6000 + Math.floor(Math.random() * 1000);
    await new Promise(r => setTimeout(r, delay));
  }
})();