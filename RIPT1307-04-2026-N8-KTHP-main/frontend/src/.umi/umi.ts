// @ts-nocheck
import './core/polyfill';
import '@@/core/devScripts';
import { plugin } from './core/plugin';
import './core/pluginRegister';
import { createHistory } from './core/history';
<<<<<<< HEAD
import { ApplyPluginsType } from 'D:/FINAL WEB/RIPT1307-04-2026-N8-KTHP-main/frontend/node_modules/@umijs/runtime';
import { renderClient } from 'D:/FINAL WEB/RIPT1307-04-2026-N8-KTHP-main/frontend/node_modules/@umijs/renderer-react/dist/index.js';
=======
import { ApplyPluginsType } from 'D:/BTLCK_NHOM8/frontend/node_modules/@umijs/runtime';
import { renderClient } from 'D:/BTLCK_NHOM8/frontend/node_modules/@umijs/renderer-react/dist/index.js';
>>>>>>> 609875ffb6e777d3fd382ae675365e4fc0e3792e
import { getRoutes } from './core/routes';



<<<<<<< HEAD
import { _onCreate } from './plugin-locale/locale';
_onCreate();
=======
>>>>>>> 609875ffb6e777d3fd382ae675365e4fc0e3792e

const getClientRender = (args: { hot?: boolean; routes?: any[] } = {}) => plugin.applyPlugins({
  key: 'render',
  type: ApplyPluginsType.compose,
  initialValue: () => {
    const opts = plugin.applyPlugins({
      key: 'modifyClientRenderOpts',
      type: ApplyPluginsType.modify,
      initialValue: {
        routes: args.routes || getRoutes(),
        plugin,
        history: createHistory(args.hot),
        isServer: process.env.__IS_SERVER,
<<<<<<< HEAD
        dynamicImport: true,
        rootElement: 'root',
=======
        rootElement: 'root',
        defaultTitle: ``,
>>>>>>> 609875ffb6e777d3fd382ae675365e4fc0e3792e
      },
    });
    return renderClient(opts);
  },
  args,
});

const clientRender = getClientRender();
export default clientRender();


    window.g_umi = {
      version: '3.5.43',
    };
  

// hot module replacement
// @ts-ignore
if (module.hot) {
  // @ts-ignore
  module.hot.accept('./core/routes', () => {
    const ret = require('./core/routes');
    if (ret.then) {
      ret.then(({ getRoutes }) => {
        getClientRender({ hot: true, routes: getRoutes() })();
      });
    } else {
      getClientRender({ hot: true, routes: ret.getRoutes() })();
    }
  });
}
