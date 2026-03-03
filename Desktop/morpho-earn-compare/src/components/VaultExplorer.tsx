'use client';

import React, { useState, useEffect } from 'react';
import { MORPHO_API_URL, GET_VAULTS_QUERY, GET_USER_POSITIONS_QUERY } from '@/api/morphoQueries';

// --- Types ---

interface Allocation {
    market: {
        uniqueKey: string;
        collateralAsset: {
            symbol: string;
            address: string;
        } | null;
    };
    supplyAssetsUsd: number;
    supplyCapUsd: number | null;
}

interface Vault {
    address: string;
    name: string;
    symbol: string;
    chain: { network: string };
    asset: { symbol: string; address: string };
    state: {
        totalAssetsUsd: number;
        totalSupply: string;
        netApy: number;
        fee: number;
        allocation: Allocation[];
    };
    liquidity: { usd: number };
}

interface UserPosition {
    vault: {
        address: string;
        name: string;
        symbol: string;
        asset: { symbol: string };
        chain: { network: string };
    };
    state: {
        assetsUsd: number;
        shares: string;
        pnlUsd: number;
        roe: number;
    };
}

// --- Helpers ---

const formatUsd = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '0.00';
    if (val >= 1e9) return (val / 1e9).toFixed(2) + 'B';
    if (val >= 1e6) return (val / 1e6).toFixed(2) + 'M';
    if (val >= 1e3) return (val / 1e3).toFixed(2) + 'K';
    return val.toFixed(2);
};

const formatPercent = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '0.00%';
    return (val * 100).toFixed(2) + '%';
};

const getChainBadge = (network: string) => {
    const net = network.toLowerCase();
    if (net === 'ethereum') return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    if (net === 'base') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (net === 'hyperliquid') return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
    return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
};

const TOKEN_COLOR_MAP: Record<string, string> = {
    USDC: 'bg-blue-600',
    USDT: 'bg-emerald-500',
    PYUSD: 'bg-indigo-900',
    DAI: 'bg-orange-400',
    USDe: 'bg-slate-200',
    WETH: 'bg-purple-500',
    WBTC: 'bg-orange-600',
    cbBTC: 'bg-orange-500',
};

// --- Main Component ---

const VaultExplorer = () => {
    const [view, setView] = useState<'vaults' | 'positions'>('vaults');
    const [vaults, setVaults] = useState<Vault[]>([]);
    const [userPositions, setUserPositions] = useState<UserPosition[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [walletAddress, setWalletAddress] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [sortBy, setSortBy] = useState<'name' | 'amount'>('amount');

    // Fetch Vaults
    const fetchVaults = async () => {
        try {
            setLoading(true);
            const res = await fetch(MORPHO_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: GET_VAULTS_QUERY,
                    variables: { chainIds: [1, 8453, 999] }
                }),
            });
            const json = await res.json();
            if (json.errors) throw new Error(json.errors[0].message);
            setVaults(json.data.vaults.items);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Fetch User Positions
    const fetchPositions = async (address: string) => {
        if (!address) return;
        try {
            setLoading(true);
            const res = await fetch(MORPHO_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: GET_USER_POSITIONS_QUERY,
                    variables: { userAddress: address }
                }),
            });
            const json = await res.json();
            if (json.errors) throw new Error(json.errors[0].message);
            setUserPositions(json.data.vaultPositions.items);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVaults();
    }, []);

    const filteredVaults = vaults
        .filter(v =>
            v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.asset.symbol.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            if (sortBy === 'name') {
                return a.name.localeCompare(b.name);
            } else {
                return (b.state.totalAssetsUsd || 0) - (a.state.totalAssetsUsd || 0);
            }
        });

    return (
        <div className="min-h-screen bg-[#0a0c0f] text-gray-300 font-sans p-6">
            {/* Top Navigation */}
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8 border-b border-gray-800 pb-2">
                    <div className="flex gap-8">
                        <button
                            onClick={() => setView('positions')}
                            className={`pb-3 px-1 text-sm font-semibold transition-colors relative ${view === 'positions' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Your positions
                            {view === 'positions' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />}
                        </button>
                        <button
                            onClick={() => setView('vaults')}
                            className={`pb-3 px-1 text-sm font-semibold transition-colors relative ${view === 'vaults' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Vaults
                            {view === 'vaults' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />}
                        </button>
                    </div>
                </div>

                {/* Sub-Header / Filters */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-4 bg-blue-600 rounded-full relative cursor-pointer">
                                <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm" />
                            </div>
                            <span className="text-[12px] font-bold text-white uppercase tracking-wider">V2</span>
                        </div>

                        {/* Sort Toggle */}
                        <div className="flex items-center bg-[#15191e] rounded-lg p-1 border border-gray-800">
                            <button
                                onClick={() => setSortBy('amount')}
                                className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${sortBy === 'amount' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-400'}`}
                            >
                                Amount
                            </button>
                            <button
                                onClick={() => setSortBy('name')}
                                className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${sortBy === 'name' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-400'}`}
                            >
                                A-Z
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="bg-gray-800 p-1.5 rounded-md cursor-pointer hover:bg-gray-700">
                                <span className="text-[12px] font-bold uppercase">Filter</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 max-w-md relative">
                        <input
                            type="text"
                            placeholder="Filter vaults"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#15191e] border border-gray-800 rounded-lg py-2 px-10 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                        />
                        <div className="absolute left-3 top-2.5 text-gray-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                {view === 'positions' && (
                    <div className="mb-8">
                        <div className="bg-[#15191e] p-6 rounded-xl border border-gray-800">
                            <h3 className="text-lg font-bold text-white mb-4">Tracking User Positions</h3>
                            <div className="flex gap-4">
                                <input
                                    type="text"
                                    placeholder="Enter wallet address (0x...)"
                                    value={walletAddress}
                                    onChange={(e) => setWalletAddress(e.target.value)}
                                    className="flex-1 bg-black/30 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-600"
                                />
                                <button
                                    onClick={() => fetchPositions(walletAddress)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg text-sm transition-colors"
                                >
                                    Fetch
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
                        <p className="text-gray-500 animate-pulse">Scanning the Morpho Graph...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate border-spacing-y-2">
                            <thead>
                                <tr className="text-[11px] font-bold text-gray-500 uppercase tracking-widest px-4">
                                    <th className="pb-4 pl-4">Vault</th>
                                    <th className="pb-4">Deposits</th>
                                    <th className="pb-4">Liquidity</th>
                                    <th className="pb-4">Curator</th>
                                    <th className="pb-4">Exposure</th>
                                    <th className="pb-4 text-right pr-4">APY</th>
                                </tr>
                            </thead>
                            <tbody>
                                {view === 'vaults' ? (
                                    filteredVaults.map((vault) => (
                                        <tr key={vault.address} className="bg-[#111419] hover:bg-[#15191e] transition-colors group cursor-pointer">
                                            <td className="py-5 pl-4 rounded-l-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${TOKEN_COLOR_MAP[vault.asset.symbol] || 'bg-gray-600'}`}>
                                                        {vault.asset.symbol[0]}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-white">{vault.name}</span>
                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-extrabold ${getChainBadge(vault.chain.network)}`}>
                                                                {vault.chain.network}
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] text-gray-500 font-medium mt-0.5">{vault.symbol}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white">
                                                        {formatUsd(vault.state.totalAssetsUsd)} <span className="text-gray-500 text-[12px]">{vault.asset.symbol}</span>
                                                    </span>
                                                    <span className="text-[11px] text-gray-500 mt-0.5 font-medium">CAP: UNLIMITED</span>
                                                </div>
                                            </td>
                                            <td className="py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white">
                                                        {formatUsd(vault.liquidity.usd)} <span className="text-gray-500 text-[12px]">{vault.asset.symbol}</span>
                                                    </span>
                                                    <span className="text-[11px] text-green-500/80 font-semibold uppercase tracking-tighter">Available</span>
                                                </div>
                                            </td>
                                            <td className="py-5">
                                                <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                                                    <svg className="w-3.5 h-3.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h.01a1 1 0 100-2H10zm3 0a1 1 0 000 2h.01a1 1 0 100-2H13zM7 13a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h.01a1 1 0 100-2H10zm3 0a1 1 0 000 2h.01a1 1 0 100-2H13z" clipRule="evenodd" /></svg>
                                                </div>
                                            </td>
                                            <td className="py-5">
                                                <div className="flex -space-x-1.5">
                                                    {Array.from(new Set(vault.state.allocation.map(a => a.market.collateralAsset?.symbol).filter(Boolean))).slice(0, 4).map((symbol, i) => (
                                                        <div key={`${vault.address}-${symbol}-${i}`} className={`w-5 h-5 rounded-full border border-[#0a0c0f] flex items-center justify-center text-[7px] font-bold text-white ${TOKEN_COLOR_MAP[symbol!] || 'bg-gray-700'}`}>
                                                            {symbol![0]}
                                                        </div>
                                                    ))}
                                                    {vault.state.allocation.length > 4 && (
                                                        <div className="w-5 h-5 rounded-full border border-[#0a0c0f] bg-gray-800 flex items-center justify-center text-[7px] font-bold text-gray-400">
                                                            +{vault.state.allocation.length - 4}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-5 pr-4 text-right rounded-r-xl">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <span className="text-sm font-bold text-white tracking-tight">{formatPercent(vault.state.netApy)}</span>
                                                    <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    userPositions.map((pos, i) => (
                                        <tr key={pos.vault.address + i} className="bg-[#111419] hover:bg-[#15191e] transition-colors group cursor-pointer">
                                            <td className="py-5 pl-4 rounded-l-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${TOKEN_COLOR_MAP[pos.vault.asset.symbol] || 'bg-gray-600'}`}>
                                                        {pos.vault.asset.symbol[0]}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-white">{pos.vault.name}</span>
                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-extrabold ${getChainBadge(pos.vault.chain.network)}`}>
                                                                {pos.vault.chain.network}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white">{formatUsd(pos.state.assetsUsd)}</span>
                                                    <span className="text-[11px] text-gray-500 mt-0.5 font-medium">Balance</span>
                                                </div>
                                            </td>
                                            <td className="py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-green-400">+{formatUsd(pos.state.pnlUsd)}</span>
                                                    <span className="text-[11px] text-gray-500 mt-0.5 font-medium">Realized PnL</span>
                                                </div>
                                            </td>
                                            <td className="py-5">
                                                <span className="text-xs font-bold text-gray-400">{(pos.state.roe || 0).toFixed(2)}% ROE</span>
                                            </td>
                                            <td className="py-5" />
                                            <td className="py-5 pr-4 text-right rounded-r-xl">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <span className="text-sm font-bold text-white tracking-tight">{formatPercent(pos.state.roe / 100)}</span>
                                                    <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}

                                {!loading && view === 'positions' && userPositions.length === 0 && walletAddress && (
                                    <tr>
                                        <td colSpan={6} className="py-10 text-center text-gray-500 text-sm italic">
                                            No active Morpho positions found for this address.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VaultExplorer;
