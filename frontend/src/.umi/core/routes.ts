// @ts-nocheck
import React from 'react';
import { ApplyPluginsType, dynamic } from 'E:/BTL/RIPT1307-04-2026-N8-KTHP/frontend/node_modules/@umijs/runtime';
import * as umiExports from './umiExports';
import { plugin } from './plugin';
import LoadingComponent from '@ant-design/pro-layout/es/PageLoading';

export function getRoutes() {
  const routes = [
  {
    "path": "/",
    "component": dynamic({ loader: () => import(/* webpackChunkName: '.umi__plugin-layout__Layout' */'E:/BTL/RIPT1307-04-2026-N8-KTHP/frontend/src/.umi/plugin-layout/Layout.tsx'), loading: LoadingComponent}),
    "routes": [
      {
        "path": "/~demos/:uuid",
        "layout": false,
        "wrappers": [dynamic({ loader: () => import(/* webpackChunkName: 'wrappers' */'../dumi/layout'), loading: LoadingComponent})],
        "component": ((props) => dynamic({
          loader: async () => {
            const React = await import('react');
            const { default: getDemoRenderArgs } = await import(/* webpackChunkName: 'dumi_demos' */ 'E:/BTL/RIPT1307-04-2026-N8-KTHP/frontend/node_modules/@umijs/preset-dumi/lib/plugins/features/demo/getDemoRenderArgs');
            const { default: Previewer } = await import(/* webpackChunkName: 'dumi_demos' */ 'dumi-theme-default/es/builtins/Previewer.js');
            const { usePrefersColor, context } = await import(/* webpackChunkName: 'dumi_demos' */ 'dumi/theme');

            return props => {
              
      const { demos } = React.useContext(context);
      const [renderArgs, setRenderArgs] = React.useState([]);

      // update render args when props changed
      React.useLayoutEffect(() => {
        setRenderArgs(getDemoRenderArgs(props, demos));
      }, [props.match.params.uuid, props.location.query.wrapper, props.location.query.capture]);

      // for listen prefers-color-schema media change in demo single route
      usePrefersColor();

      switch (renderArgs.length) {
        case 1:
          // render demo directly
          return renderArgs[0];

        case 2:
          // render demo with previewer
          return React.createElement(
            Previewer,
            renderArgs[0],
            renderArgs[1],
          );

        default:
          return `Demo ${props.match.params.uuid} not found :(`;
      }
    
            }
          },
          loading: () => null,
        }))()
      },
      {
        "path": "/_demos/:uuid",
        "redirect": "/~demos/:uuid"
      },
      {
        "__dumiRoot": true,
        "layout": false,
        "path": "/~docs",
        "wrappers": [dynamic({ loader: () => import(/* webpackChunkName: 'wrappers' */'../dumi/layout'), loading: LoadingComponent}), dynamic({ loader: () => import(/* webpackChunkName: 'wrappers' */'E:/BTL/RIPT1307-04-2026-N8-KTHP/frontend/node_modules/dumi-theme-default/es/layout.js'), loading: LoadingComponent})],
        "routes": [],
        "title": "BorrowX",
        "component": (props) => props.children
      },
      {
        "path": "/",
        "name": "Đăng nhập",
        "icon": "LoginOutlined",
        "component": dynamic({ loader: () => import(/* webpackChunkName: 'p__Login' */'E:/BTL/RIPT1307-04-2026-N8-KTHP/frontend/src/pages/Login'), loading: LoadingComponent}),
        "layout": false,
        "exact": true
      },
      {
        "path": "/student",
        "name": "Sinh viên",
        "icon": "BookOutlined",
        "component": dynamic({ loader: () => import(/* webpackChunkName: 'p__Student' */'E:/BTL/RIPT1307-04-2026-N8-KTHP/frontend/src/pages/Student'), loading: LoadingComponent}),
        "access": "canStudent",
        "exact": true
      },
      {
        "path": "/admin",
        "name": "Quản trị viên",
        "icon": "CrownOutlined",
        "component": dynamic({ loader: () => import(/* webpackChunkName: 'p__Admin' */'E:/BTL/RIPT1307-04-2026-N8-KTHP/frontend/src/pages/Admin'), loading: LoadingComponent}),
        "access": "canAdmin",
        "exact": true
      }
    ]
  }
];

  // allow user to extend routes
  plugin.applyPlugins({
    key: 'patchRoutes',
    type: ApplyPluginsType.event,
    args: { routes },
  });

  return routes;
}
