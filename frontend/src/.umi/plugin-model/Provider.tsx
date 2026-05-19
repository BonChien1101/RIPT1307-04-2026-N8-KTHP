// @ts-nocheck
import React from 'react';
<<<<<<< HEAD
import initialState from 'D:/FINAL WEB/RIPT1307-04-2026-N8-KTHP-main/frontend/src/.umi/plugin-initial-state/models/initialState';
=======
import initialState from 'D:/BTLCK_NHOM8/frontend/src/.umi/plugin-initial-state/models/initialState';
>>>>>>> 609875ffb6e777d3fd382ae675365e4fc0e3792e

// @ts-ignore
import Dispatcher from './helpers/dispatcher';
// @ts-ignore
import Executor from './helpers/executor';
// @ts-ignore
import { UmiContext } from './helpers/constant';

export const models = { '@@initialState': initialState,  };

export type Model<T extends keyof typeof models> = {
  [key in keyof typeof models]: ReturnType<typeof models[T]>;
};

export type Models<T extends keyof typeof models> = Model<T>[T]

const dispatcher = new Dispatcher!();
const Exe = Executor!;

export default ({ children }: { children: React.ReactNode }) => {

  return (
    <UmiContext.Provider value={dispatcher}>
      {
        Object.entries(models).map(pair => (
          <Exe key={pair[0]} namespace={pair[0]} hook={pair[1] as any} onUpdate={(val: any) => {
            const [ns] = pair as [keyof typeof models, any];
            dispatcher.data[ns] = val;
            dispatcher.update(ns);
          }} />
        ))
      }
      {children}
    </UmiContext.Provider>
  )
}
