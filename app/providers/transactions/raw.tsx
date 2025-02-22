'use client';

import * as Cache from '@providers/cache';
import { ActionType, FetchStatus } from '@providers/cache';
import { useCluster } from '@providers/cluster';
import { Connection, DecompileArgs, TransactionMessage, TransactionSignature, VersionedMessage } from '@solana/web3.js';
import { Cluster } from '@utils/cluster';
import React from 'react';

export interface Details {
    raw?: {
        transaction: TransactionMessage;
        message: VersionedMessage;
        signatures: string[];
    } | null;
}

type State = Cache.State<Details>;
type Dispatch = Cache.Dispatch<Details>;

export const StateContext = React.createContext<State | undefined>(undefined);
export const DispatchContext = React.createContext<Dispatch | undefined>(undefined);

type DetailsProviderProps = { children: React.ReactNode };
export function RawDetailsProvider({ children }: DetailsProviderProps) {
    const { url } = useCluster();
    const [state, dispatch] = Cache.useReducer<Details>(url);

    React.useEffect(() => {
        dispatch({ type: ActionType.Clear, url });
    }, [dispatch, url]);

    return (
        <StateContext.Provider value={state}>
            <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
        </StateContext.Provider>
    );
}

export function useRawTransactionDetails(signature: TransactionSignature): Cache.CacheEntry<Details> | undefined {
    const context = React.useContext(StateContext);

    if (!context) {
        throw new Error(`useRawTransactionDetails must be used within a TransactionsProvider`);
    }

    return context.entries[signature];
}

async function fetchRawTransaction(dispatch: Dispatch, signature: TransactionSignature, cluster: Cluster, url: string) {
    let fetchStatus;
    try {
        const response = await new Connection(url).getTransaction(signature, {
            maxSupportedTransactionVersion: 0,
        });
        fetchStatus = FetchStatus.Fetched;

        let data: Details = { raw: null };
        if (response !== null) {
            const { message, signatures } = response.transaction;
            const accountKeysFromLookups = response.meta?.loadedAddresses;
            const decompileArgs: DecompileArgs | undefined = accountKeysFromLookups && { accountKeysFromLookups };
            data = {
                raw: {
                    message,
                    signatures,
                    transaction: TransactionMessage.decompile(message, decompileArgs),
                },
            };
        }

        dispatch({
            data,
            key: signature,
            status: fetchStatus,
            type: ActionType.Update,
            url,
        });
    } catch (error) {
        console.error(error, { url });
    }
}

export function useFetchRawTransaction() {
    const dispatch = React.useContext(DispatchContext);
    if (!dispatch) {
        throw new Error(`useFetchRawTransaction must be used within a TransactionsProvider`);
    }

    const { cluster, url } = useCluster();
    return React.useCallback(
        (signature: TransactionSignature) => {
            url && fetchRawTransaction(dispatch, signature, cluster, url);
        },
        [dispatch, cluster, url]
    );
}
