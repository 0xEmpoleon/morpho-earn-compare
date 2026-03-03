import React, { useState } from 'react';

// Organized by chain to handle the toggling
const MOCK_CHAIN_DATA = {
    Ethereum: [
        {
            symbol: "USDT", name: "Tether", color: "bg-emerald-500",
            rates: {
                aave: { val: "3.40%", tvl: "5.6B" },
                spark: { val: "3.61%", tvl: "332.7M" },
                compound: { val: "3.18%", tvl: "227.5M", highlight: true },
                dolomite: { val: "5.95%", tvl: "1.6M" },
            }
        },
        {
            symbol: "USDC", name: "USD Coin", color: "bg-blue-600",
            rates: {
                aave: { val: "3.09%", tvl: "4.5B" },
                spark: { val: "3.75%", tvl: "50.0M" },
                compound: { val: "2.99%", tvl: "400.4M" },
                fluid: { val: "0.30%", tvl: "3.3M", highlight: true },
                dolomite: { val: "5.84%", tvl: "125.4M" },
            }
        },
        {
            symbol: "PYUSD", name: "PayPal USD", color: "bg-indigo-900",
            rates: {
                aave: { val: "3.19%", tvl: "444.9M", highlight: true },
                spark: { val: "4.32%", tvl: "100.0M" },
            }
        },
        {
            symbol: "DAI", name: "Dai", color: "bg-orange-400",
            rates: {
                aave: { val: "3.22%", tvl: "184.6M", highlight: true },
            }
        },
        {
            symbol: "USDE", name: "USDe", color: "bg-slate-200",
            rates: {
                aave: { val: "2.61%", tvl: "1.1B" },
                morpho: { val: "0.04%", tvl: "364.3K", highlight: true },
            }
        }
    ],
    Base: [
        {
            symbol: "USDC", name: "USD Coin", color: "bg-blue-600",
            rates: {
                aave: { val: "4.15%", tvl: "85.2M", highlight: true },
                compound: { val: "3.80%", tvl: "42.1M" },
            }
        },
        {
            symbol: "USDT", name: "Tether", color: "bg-emerald-500",
            rates: {
                aave: { val: "4.82%", tvl: "12.4M" },
            }
        },
        {
            symbol: "DAI", name: "Dai", color: "bg-orange-400",
            rates: {
                aave: { val: "3.90%", tvl: "8.1M" },
            }
        }
    ],
    Hyperliquid: [
        {
            symbol: "USDC", name: "USD Coin", color: "bg-blue-600",
            rates: {
                fluid: { val: "8.50%", tvl: "15.3M", highlight: true },
                spark: { val: "7.20%", tvl: "4.2M" },
            }
        },
        {
            symbol: "USDT", name: "Tether", color: "bg-emerald-500",
            rates: {
                fluid: { val: "9.10%", tvl: "8.9M", highlight: true },
            }
        }
    ]
};

const StablecoinDashboard = () => {
    const [activeChain, setActiveChain] = useState('Ethereum');

    const chains = ['Ethereum', 'Base', 'Hyperliquid'];

    const protocols = [
        { id: 'aave', name: 'Aave v3', sub: 'Borrow' },
        { id: 'morpho', name: 'Morpho v1', sub: 'Borrow' },
        { id: 'spark', name: 'Sparklend' },
        { id: 'sky', name: 'Sky Lending' },
        { id: 'compound', name: 'Compound v3' },
        { id: 'fluid', name: 'Fluid Lending' },
        { id: 'dolomite', name: 'Dolomite' },
        { id: 'franken', name: 'Frankencoin' },
    ];

    // Type assertion below to allow indexing by key
    const currentData = (MOCK_CHAIN_DATA as any)[activeChain] || [];

    return (
        <div className="p-8 bg-white font-sans w-full rounded-xl shadow-sm border border-gray-100">

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

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-y-4">
                    <thead>
                        <tr>
                            <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider p-4 border-b border-gray-100">Token</th>
                            {protocols.map(p => (
                                <th key={p.id} className="text-center p-3 min-w-[130px] border-b border-gray-100">
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="text-[13px] font-extrabold text-slate-800">{p.name}</div>
                                        {p.sub && <div className="text-[11px] font-semibold text-blue-600 border-b border-blue-600 pb-[1px] cursor-pointer hover:text-blue-800">{p.sub}</div>}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {currentData.map((token: any) => (
                            <tr key={token.symbol} className="group transition-colors">
                                <td className="py-4 px-2 border-b border-gray-100">
                                    <div className="flex items-center gap-3 min-w-[120px]">
                                        <div className={`w-8 h-8 rounded-full ${token.color} flex items-center justify-center text-white font-bold text-[12px] shadow-sm`}>
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
                                                <div className={`flex flex-col items-center justify-center py-2 px-1 rounded-md transition-all cursor-pointer border
                          ${data.highlight
                                                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                                        : 'bg-white border-blue-100 text-blue-700 hover:bg-blue-50'}`}>
                                                    <span className="text-[14px] font-bold">{data.val}</span>
                                                    <span className={`text-[9px] font-semibold uppercase mt-0.5 ${data.highlight ? 'text-blue-100' : 'text-slate-400'}`}>
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
                                    No stablecoin data available for {activeChain}.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StablecoinDashboard;
