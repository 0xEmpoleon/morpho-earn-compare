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

    // Filter States
    const [selectedChains, setSelectedChains] = useState<string[]>([]);
    const [selectedCurators, setSelectedCurators] = useState<string[]>([]);
    const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

    // Sort States
    const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'totalAssetsUsd' | 'liquidity' | 'netApy', direction: 'asc' | 'desc' }>({
        key: 'totalAssetsUsd',
        direction: 'desc'
    });

    // Derived Data for Filters
    const ALLOWED_ASSETS = ['DAI', 'EURC', 'USDC', 'USDT', 'USDe', 'USD₮0'];
    const ALLOWED_CURATORS = ['Gauntlet', 'Felix', 'Steakhouse', 'SparkSentra', 'Spark'];

    const availableChains = Array.from(new Set(vaults.map(v => v.chain.network))).sort();
    const availableAssets = Array.from(new Set(vaults.map(v => v.asset.symbol)))
        .filter(symbol => ALLOWED_ASSETS.includes(symbol))
        .sort();

    // We only show curators that actually exist in the vault list or match the whitelist
    const availableCurators = ALLOWED_CURATORS.filter(cur =>
        vaults.some(v => v.name.toLowerCase().includes(cur.toLowerCase()))
    ).sort();

    const toggleFilter = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
        setList(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    };

    const handleSort = (key: 'name' | 'totalAssetsUsd' | 'liquidity' | 'netApy') => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Fetch Vaults
    const fetchVaults = async (isRefresh = false) => {
        try {
            if (!isRefresh) setLoading(true);
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
            setLastUpdated(new Date());
        } catch (err: any) {
            setError(err.message);
        } finally {
            if (!isRefresh) setLoading(false);
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
        const interval = setInterval(() => fetchVaults(true), 60000);
        return () => clearInterval(interval);
    }, []);

    const filteredVaults = vaults
        .filter(v => {
            const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.asset.symbol.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesChain = selectedChains.length === 0 || selectedChains.includes(v.chain.network);
            const matchesAsset = selectedAssets.length === 0 || selectedAssets.includes(v.asset.symbol);
            const matchesCurator = selectedCurators.length === 0 ||
                selectedCurators.some(cur => v.name.toLowerCase().includes(cur.toLowerCase()));

            return matchesSearch && matchesChain && matchesAsset && matchesCurator;
        })
        .sort((a, b) => {
            let valA: any;
            let valB: any;

            if (sortConfig.key === 'name') {
                valA = a.name;
                valB = b.name;
            } else if (sortConfig.key === 'liquidity') {
                valA = a.liquidity.usd;
                valB = b.liquidity.usd;
            } else if (sortConfig.key === 'netApy') {
                valA = a.state.netApy;
                valB = b.state.netApy;
            } else {
                valA = a.state.totalAssetsUsd;
                valB = b.state.totalAssetsUsd;
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

    const SortIcon = ({ column }: { column: typeof sortConfig.key }) => {
        if (sortConfig.key !== column) return <span className="ml-1 opacity-20">⇅</span>;
        return <span className="ml-1 text-blue-500">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
    };

    return (
        <div className="min-h-screen bg-[#0a0c0f] text-gray-300 font-sans p-6">
            <div className="max-w-7xl mx-auto">
                {/* Top Navigation */}
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

                {/* Sub-Header / Complex Filters */}
                <div className="flex flex-col gap-6 mb-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 mr-4">
                                <div className="w-8 h-4 bg-blue-600 rounded-full relative cursor-pointer">
                                    <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm" />
                                </div>
                                <span className="text-[12px] font-bold text-white uppercase tracking-wider">V2</span>
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

                        <div className="flex items-center gap-4">
                            {lastUpdated && (
                                <span className="text-[10px] text-gray-600 font-medium whitespace-nowrap">
                                    Last update: {lastUpdated.toLocaleTimeString()}
                                </span>
                            )}
                            <button
                                onClick={() => { setSelectedChains([]); setSelectedAssets([]); setSelectedCurators([]); setSearchQuery(''); }}
                                className="text-[11px] font-bold uppercase text-gray-500 hover:text-white transition-colors px-3"
                            >
                                Reset Filters
                            </button>
                        </div>
                    </div>

                    {/* Multi-select filter groups */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#111419] p-5 rounded-xl border border-gray-800/50">
                        {/* Chain Filter */}
                        <div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-3">Chains</span>
                            <div className="flex flex-wrap gap-2">
                                {availableChains.map(chain => (
                                    <button
                                        key={chain}
                                        onClick={() => toggleFilter(selectedChains, setSelectedChains, chain)}
                                        className={`px-3 py-1.5 rounded-md text-[11px] font-bold border transition-all ${selectedChains.includes(chain) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-black/20 border-gray-800 text-gray-500 hover:border-gray-600'}`}
                                    >
                                        {chain.charAt(0).toUpperCase() + chain.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Assets Filter */}
                        <div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-3">Assets</span>
                            <div className="flex flex-wrap gap-2">
                                {availableAssets.map(asset => (
                                    <button
                                        key={asset}
                                        onClick={() => toggleFilter(selectedAssets, setSelectedAssets, asset)}
                                        className={`px-3 py-1.5 rounded-md text-[11px] font-bold border transition-all ${selectedAssets.includes(asset) ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-black/20 border-gray-800 text-gray-500 hover:border-gray-600'}`}
                                    >
                                        {asset}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Curators Filter */}
                        <div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-3">Curators</span>
                            <div className="flex flex-wrap gap-2">
                                {availableCurators.map(curator => (
                                    <button
                                        key={curator}
                                        onClick={() => toggleFilter(selectedCurators, setSelectedCurators, curator)}
                                        className={`px-3 py-1.5 rounded-md text-[11px] font-bold border transition-all ${selectedCurators.includes(curator) ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-black/20 border-gray-800 text-gray-500 hover:border-gray-600'}`}
                                    >
                                        {curator}
                                    </button>
                                ))}
                            </div>
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
                                    <th className="pb-4 pl-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('name')}>
                                        Vault <SortIcon column="name" />
                                    </th>
                                    <th className="pb-4">Chain</th>
                                    <th className="pb-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('totalAssetsUsd')}>
                                        Deposits <SortIcon column="totalAssetsUsd" />
                                    </th>
                                    <th className="pb-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('liquidity')}>
                                        Liquidity <SortIcon column="liquidity" />
                                    </th>
                                    <th className="pb-4">Curator</th>
                                    <th className="pb-4">Exposure</th>
                                    <th className="pb-4 text-right pr-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('netApy')}>
                                        APY <SortIcon column="netApy" />
                                    </th>
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
                                                        <span className="text-sm font-bold text-white block">{vault.name}</span>
                                                        <div className="text-[11px] text-gray-500 font-medium mt-0.5">{vault.symbol}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5">
                                                <span className={`text-[9px] px-2 py-0.5 rounded border uppercase font-extrabold ${getChainBadge(vault.chain.network)}`}>
                                                    {vault.chain.network}
                                                </span>
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
                                                        <span className="text-sm font-bold text-white block">{pos.vault.name}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5">
                                                <span className={`text-[9px] px-2 py-0.5 rounded border uppercase font-extrabold ${getChainBadge(pos.vault.chain.network)}`}>
                                                    {pos.vault.chain.network}
                                                </span>
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
                                        <td colSpan={7} className="py-10 text-center text-gray-500 text-sm italic">
                                            No active Morpho positions found for this address.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div >
    );
};

export default VaultExplorer;
