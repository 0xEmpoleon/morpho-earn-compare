export const MORPHO_API_URL = 'https://api.morpho.org/graphql';

export const GET_VAULTS_QUERY = `
query GetVaults($chainIds: [Int!]) {
  vaults(first: 100, where: { chainId_in: $chainIds }) {
    items {
      address
      name
      symbol
      chain {
        network
      }
      asset {
        symbol
        address
      }
      state {
        totalAssetsUsd
        totalSupply
        netApy
        fee
        allocation {
          market {
            uniqueKey
            collateralAsset {
              symbol
              address
            }
          }
          supplyAssetsUsd
          supplyCapUsd
        }
      }
      liquidity {
          usd
      }
    }
  }
}
`;

export const GET_USER_POSITIONS_QUERY = `
query GetUserPositions($userAddress: Address!) {
  vaultPositions(first: 50, where: { userAddress_in: [$userAddress] }) {
    items {
      vault {
        address
        name
        symbol
        asset {
          symbol
        }
        chain {
          network
        }
      }
      state {
        assetsUsd
        shares
        pnlUsd
        roe
      }
    }
  }
}
`;

export const GET_VAULT_HISTORY_QUERY = `
query GetVaultHistory($vaultAddress: Address!) {
  vaultByAddress(address: $vaultAddress) {
    historicalState {
      netApy {
        timestamp
        value
      }
    }
  }
}
`;
