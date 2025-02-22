'use client';

import * as Cache from '@providers/cache';
import { useCluster } from '@providers/cluster';
import { Connection, PublicKey, VersionedBlockResponse } from '@solana/web3.js';
import { Cluster } from '@utils/cluster';
import React from 'react';

export enum FetchStatus {
    Fetching,
    FetchFailed,
    Fetched,
}

export enum ActionType {
    Update,
    Clear,
}

type Block = {
    block?: VersionedBlockResponse;
    blockLeader?: PublicKey;
    childSlot?: number;
    childLeader?: PublicKey;
    parentLeader?: PublicKey;
};

type State = Cache.State<Block>;
type Dispatch = Cache.Dispatch<Block>;

const StateContext = React.createContext<State | undefined>(undefined);
const DispatchContext = React.createContext<Dispatch | undefined>(undefined);

type BlockProviderProps = { children: React.ReactNode };

export function BlockProvider({ children }: BlockProviderProps) {
    const { url } = useCluster();
    const [state, dispatch] = Cache.useReducer<Block>(url);

    React.useEffect(() => {
        dispatch({ type: ActionType.Clear, url });
    }, [dispatch, url]);

    return (
        <StateContext.Provider value={state}>
            <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
        </StateContext.Provider>
    );
}

export function useBlock(key: number): Cache.CacheEntry<Block> | undefined {
    const context = React.useContext(StateContext);

    if (!context) {
        throw new Error(`useBlock must be used within a BlockProvider`);
    }

    return context.entries[key];
}

export async function fetchBlock(dispatch: Dispatch, url: string, cluster: Cluster, slot: number) {
    dispatch({
        key: slot,
        status: FetchStatus.Fetching,
        type: ActionType.Update,
        url,
    });

    let status: FetchStatus;
    let data: Block | undefined = undefined;

    try {
        const connection = new Connection(url, 'confirmed');
        const block = await connection.getBlock(slot, {
            maxSupportedTransactionVersion: 0,
        });
        if (block === null) {
            data = {};
            status = FetchStatus.Fetched;
        } else {
            const childSlot = (await connection.getBlocks(slot + 1, slot + 100)).shift();
            const firstLeaderSlot = block.parentSlot;

            let leaders: PublicKey[] = [];
            try {
                const lastLeaderSlot = childSlot !== undefined ? childSlot : slot;
                const slotLeadersLimit = lastLeaderSlot - block.parentSlot + 1;
                leaders = await connection.getSlotLeaders(firstLeaderSlot, slotLeadersLimit);
            } catch (err) {
                // ignore errors
            }

            const getLeader = (slot: number) => {
                return leaders.at(slot - firstLeaderSlot);
            };

            data = {
                block,
                blockLeader: getLeader(slot),
                childLeader: childSlot !== undefined ? getLeader(childSlot) : undefined,
                childSlot,
                parentLeader: getLeader(block.parentSlot),
            };
            status = FetchStatus.Fetched;
        }
    } catch (err) {
        status = FetchStatus.FetchFailed;
        console.error(err, { tags: { url } });
    }

    dispatch({
        data,
        key: slot,
        status,
        type: ActionType.Update,
        url,
    });
}

export function useFetchBlock() {
    const dispatch = React.useContext(DispatchContext);
    if (!dispatch) {
        throw new Error(`useFetchBlock must be used within a BlockProvider`);
    }

    const { cluster, url } = useCluster();
    return React.useCallback((key: number) => fetchBlock(dispatch, url, cluster, key), [dispatch, cluster, url]);
}
