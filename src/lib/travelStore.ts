import { create } from 'zustand';

type TravelState = {
  enabled: boolean;
  setEnabled: (v:boolean)=>void;
};
export const useTravel = create<TravelState>((set)=> ({
  enabled: false,
  setEnabled: (enabled)=> set({ enabled })
}));
