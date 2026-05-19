// @ts-nocheck
<<<<<<< HEAD
import { createBrowserHistory, History } from 'D:/FINAL WEB/RIPT1307-04-2026-N8-KTHP-main/frontend/node_modules/@umijs/runtime';
=======
import { createBrowserHistory, History } from 'D:/BTLCK_NHOM8/frontend/node_modules/@umijs/runtime';
>>>>>>> 609875ffb6e777d3fd382ae675365e4fc0e3792e

let options = {
  "basename": "/"
};
if ((<any>window).routerBase) {
  options.basename = (<any>window).routerBase;
}

// remove initial history because of ssr
let history: History = process.env.__IS_SERVER ? null : createBrowserHistory(options);
export const createHistory = (hotReload = false) => {
  if (!hotReload) {
    history = createBrowserHistory(options);
  }

  return history;
};

export { history };
