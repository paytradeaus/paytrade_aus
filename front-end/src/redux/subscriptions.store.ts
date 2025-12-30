import { configureStore } from "@reduxjs/toolkit";
import type { TypedUseSelectorHook } from "react-redux";

import { useDispatch, useSelector, useStore } from "react-redux";
import SubscriptionDetails from "./slices/SubscriptionDetails";

export const makeStore = () => {
  return configureStore({
    reducer: {
      subscription: SubscriptionDetails,
    },
  });
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useSubscriptionDispatch: () => AppDispatch = useDispatch;
export const useSubscriptionSelector: TypedUseSelectorHook<RootState> =
  useSelector;
export const useSubscriptionStore: () => AppStore = useStore;
