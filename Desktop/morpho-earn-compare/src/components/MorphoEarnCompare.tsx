'use client';

import React, { useState, useEffect } from 'react';

// Define the GraphQL response types
interface VaultState {
    netApy: number;
    totalAssetsUsd: number | null;
}

interface VaultAsset {
    symbol: string;
}

interface VaultChain {
    network: string;
}

interface VaultItem {
    name: string;
    chain: VaultChain;
    asset: VaultAsset;
    state: VaultState;
}

interface GraphQLResponse {
    data: {
        vaults: {
            items: VaultItem[];
        };
    };
}

// Our parsed data structure
interface ProcessedVault {
    val: string; // e.g., "5.60%"
    tvl: string; // e.g., "5.6M"
    highlight: boolean;
    tvlRaw: number;
}

interface TokenData {
    symbol: string;
    name: string;
    color: string;
    rates: Record<string, ProcessedVault>;
}

interface ChainData {
    [chainName: string]: TokenData[];
}

const MORPHO_API_URL = 'https://api.morpho.org/graphql';

const QUERY = `
{
  vaults(first: 100, where: { chainId_in: [1, 8453, 999] }) {
    items {
      name
      chain {
        network
      }
      asset {
        symbol
      }
      state {
        netApy
        totalAssetsUsd
      }
    }
  }
}
`;

// Map known symbols to names and colors
const TOKEN_INFO_MAP: Record<string, { name: string; color: string }> = {
    USDC: { name: 'USD Coin', color: 'bg-blue-600' },
    USDT: { name: 'Tether', color: 'bg-emerald-500' },
    PYUSD: { name: 'PayPal USD', color: 'bg-indigo-900' },
    DAI: { name: 'Dai', color: 'bg-orange-400' },
    USDe: { name: 'USDe', color: 'bg-slate-200' },
    WETH: { name: 'Wrapped Ether', color: 'bg-purple-500' },
    cbBTC: { name: 'Coinbase BTC', color: 'bg-orange-500' },
    wstETH: { name: 'Wrapped stETH', color: 'bg-blue-400' },
};

function formatTvl(usd: number): string {
    if (usd >= 1e9) return (usd / 1e9).toFixed(1) + 'B';
    if (usd >= 1e6) return (usd / 1e6).toFixed(1) + 'M';
    if (usd >= 1e3) return (usd / 1e3).toFixed(1) + 'K';
    return usd.toFixed(0);
}

function processVaultData(items: VaultItem[]) {
    const chainMap: ChainData = {
        Ethereum: [],
        Base: [],
        Hyperliquid: [],
    };

    const protocolsSet = new Set<string>();

    // Map network names from GraphQL to our UI names
    const networkMapping: Record<string, keyof ChainData> = {
        ethereum: 'Ethereum',
        base: 'Base',
        Hyperliquid: 'Hyperliquid',
    };

    // Intermediate storage: chain -> symbol -> TokenData
    const intermediate: Record<string, Record<string, TokenData>> = {
        Ethereum: {},
        Base: {},
        Hyperliquid: {},
    };

    items.forEach((item) => {
        // Skip tiny or empty vaults
        if (!item.state.totalAssetsUsd || item.state.totalAssetsUsd < 1000) return;
        if (item.state.netApy === 0) return;

        const chainName = networkMapping[item.chain.network];
        if (!chainName) return;

        const symbol = item.asset.symbol;
        const nameStr = item.name.trim();
        if (!nameStr) return;

        // Use the first word of the vault name as the "Protocol/Curator"
        const curator = nameStr.split(' ')[0];
        protocolsSet.add(curator);

        const tvlRaw = item.state.totalAssetsUsd;
        const tvlFormatted = formatTvl(tvlRaw);
        const apyFormatted = (item.state.netApy * 100).toFixed(2) + '%';

        if (!intermediate[chainName][symbol]) {
            const info = TOKEN_INFO_MAP[symbol] || { name: symbol, color: 'bg-slate-500' };
            intermediate[chainName][symbol] = {
                symbol,
                name: info.name,
                color: info.color,
                rates: {},
            };
        }

        const currentRates = intermediate[chainName][symbol].rates;
        // If multiple vaults share the same curator and token, keep the one with higher TVL
        if (!currentRates[curator] || tvlRaw > currentRates[curator].tvlRaw) {
            currentRates[curator] = {
                val: apyFormatted,
                tvl: tvlFormatted,
                highlight: false,
                tvlRaw,
            };
        }
    });

    // Calculate highlights (highest APY for each token)
    Object.keys(intermediate).forEach((chain) => {
        Object.values(intermediate[chain]).forEach((token) => {
            let maxApyCurator = '';
            let maxApyVal = -1;

            Object.entries(token.rates).forEach(([curator, rate]) => {
                const apyNum = parseFloat(rate.val);
                if (apyNum > maxApyVal) {
                    maxApyVal = apyNum;
                    maxApyCurator = curator;
                }
            });

            if (maxApyCurator) {
                token.rates[maxApyCurator].highlight = true;
            }

            chainMap[chain].push(token);
        });
    });

    // Sort protocols by string alphabetically for consistent columns
    const sortedProtocols = Array.from(protocolsSet)
        .sort()
        .map((p) => ({ id: p, name: p, sub: 'Vault' }));

    return { chainMap, protocols: sortedProtocols };
}

const StablecoinDashboard = () => {
    const [activeChain, setActiveChain] = useState<string>('Ethereum');
    const [chainData, setChainData] = useState<ChainData>({
        Ethereum: [],
        Base: [],
        Hyperliquid: [],
    });
    const [protocols, setProtocols] = useState<{ id: string; name: string; sub: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const chains = ['Ethereum', 'Base', 'Hyperliquid'];

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const res = await fetch(MORPHO_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: QUERY }),
                });

                if (!res.ok) {
                    throw new Error('Failed to fetch from Morpho API');
                }

                const json = (await res.json()) as GraphQLResponse;
                if (!json.data || !json.data.vaults) {
                    throw new Error('Invalid GraphQL response');
                }

                const { chainMap, protocols: parsedProtocols } = processVaultData(json.data.vaults.items);
                setChainData(chainMap);
                setProtocols(parsedProtocols);
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'Error loading data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const currentData = chainData[activeChain] || [];

    return (
        <div className="p-8 bg-white font-sans w-full rounded-xl shadow-sm border border-gray-100 min-h-[400px]">
            {/* Chain Selector */}
            <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                <span className="text-sm font-bold text-gray-500 mr-2 uppercase tracking-wide">Network</span>
                {chains.map((chain) => (
                    <button
                        key={chain}
                        onClick={() => setActiveChain(chain)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${activeChain === chain
                                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                                : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        {chain}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-4">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium">Fetching live APY data from Morpho...</p>
                </div>
            ) : error ? (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100">{error}</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-separate border-spacing-y-4">
                        <thead>
                            <tr>
                                <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider p-4 border-b border-gray-100">
                                    Token
                                </th>
                                {protocols.map((p) => (
                                    <th key={p.id} className="text-center p-3 min-w-[130px] border-b border-gray-100">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="text-[13px] font-extrabold text-slate-800">{p.name}</div>
                                            {p.sub && (
                                                <div className="text-[11px] font-semibold text-blue-600 border-b border-blue-600 pb-[1px] cursor-pointer hover:text-blue-800">
                                                    {p.sub}
                                                </div>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {currentData.map((token) => (
                                <tr key={token.symbol} className="group transition-colors">
                                    <td className="py-4 px-2 border-b border-gray-100">
                                        <div className="flex items-center gap-3 min-w-[120px]">
                                            <div
                                                className={`w-8 h-8 rounded-full ${token.color} flex items-center justify-center text-white font-bold text-[12px] shadow-sm`}
                                            >
                                                {token.symbol[0]}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900">{token.symbol}</span>
                                                <span className="text-[11px] text-slate-500 font-medium">{token.name}</span>
                                            </div>
                                        </div>
                                    </td>

                                    {protocols.map((p) => {
                                        const data = token.rates[p.id];
                                        return (
                                            <td key={p.id} className="p-2 border-b border-gray-100">
                                                {data ? (
                                                    <div
                                                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-md transition-all cursor-pointer border
                          ${data.highlight
                                                                ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                                                : 'bg-white border-blue-100 text-blue-700 hover:bg-blue-50'
                                                            }`}
                                                    >
                                                        <span className="text-[14px] font-bold">{data.val}</span>
                                                        <span
                                                            className={`text-[9px] font-semibold uppercase mt-0.5 ${data.highlight ? 'text-blue-100' : 'text-slate-400'
                                                                }`}
                                                        >
                                                            TVL ${data.tvl}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="h-12 w-[90%] mx-auto flex items-center justify-center bg-gray-50/80 rounded-md border border-gray-200/60">
                                                        <span className="text-gray-400 font-medium">—</span>
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}

                            {/* Empty State if no tokens for a chain */}
                            {currentData.length === 0 && (
                                <tr>
                                    <td colSpan={protocols.length + 1} className="py-12 text-center text-gray-500 font-medium">
                                        No active vault data available for {activeChain}.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default StablecoinDashboard;
